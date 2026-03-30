import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { db, settingsTable } from "@workspace/db";
import { TOOL_DEFINITIONS } from "../tools/definitions";
import { executeTool } from "../tools/executor";

const router: IRouter = Router();

/** Well-known provider base URLs */
const PROVIDER_URLS: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  openrouter: "https://openrouter.ai/api/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai",
  grok: "https://api.x.ai/v1",
};

/** Default models per provider */
const DEFAULT_MODELS: Record<string, string> = {
  openai: "gpt-4o",
  openrouter: "openai/gpt-4o",
  gemini: "gemini-2.5-flash",
  grok: "grok-3",
};

/** Maximum number of tool-call loop iterations to prevent runaway chains */
const MAX_TOOL_ITERATIONS = 10;

async function getAiConfig() {
  const rows = await db.select().from(settingsTable);
  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }

  const provider = settings["ai_provider"] || "openai";
  const apiKey = settings["ai_api_key"] || "";
  const baseURL =
    settings["ai_base_url"] || PROVIDER_URLS[provider] || PROVIDER_URLS.openai;
  const model =
    settings["ai_model"] || DEFAULT_MODELS[provider] || "gpt-4o";

  return { provider, apiKey, baseURL, model };
}

/** Describes a single tool invocation for the frontend activity log */
interface ToolActivity {
  tool: string;
  args: Record<string, any>;
  result: string;
}

router.post("/ai/chat", async (req, res): Promise<void> => {
  const {
    message,
    context,
    fileContent,
    filePath,
    cursorInfo,
    diagnostics,
    history = [],
    projectId,
  } = req.body;

  if (!message) {
    res.status(400).json({ error: "bad_request", message: "message is required" });
    return;
  }

  const config = await getAiConfig();

  if (!config.apiKey) {
    res.status(400).json({
      error: "no_api_key",
      message:
        "No AI API key configured. Go to Settings → AI Provider to add your key.",
    });
    return;
  }

  const openai = new OpenAI({
    baseURL: config.baseURL,
    apiKey: config.apiKey,
  });

  // ── Build the system prompt with all available context ──
  const contextParts: string[] = [
    `You are an expert coding assistant built into the Softcurse LiveScriptor IDE.`,
    `You have access to powerful tools that let you read files, write files, search code, list directories, and run shell commands in the user's project.`,
    `Use your tools proactively to understand the codebase before answering. Do NOT ask the user to paste code — read it yourself with get_file_content.`,
    `When the user asks you to fix, create, or modify code, use write_file or create_file to apply changes directly.`,
    `When the user asks you to run something, use run_command.`,
    `Always explain what you did after performing actions.`,
    `Format code blocks with proper syntax highlighting.`,
  ];

  if (filePath) contextParts.push(`\nCurrently open file: ${filePath}`);
  if (fileContent)
    contextParts.push(
      `\nCurrent file content:\n\`\`\`\n${fileContent.slice(0, 4000)}\n\`\`\``
    );
  if (cursorInfo)
    contextParts.push(
      `\nCursor position: line ${cursorInfo.line}, column ${cursorInfo.column}`
    );
  if (diagnostics && diagnostics.length > 0)
    contextParts.push(
      `\nEditor diagnostics (lint errors/warnings):\n${diagnostics
        .slice(0, 20)
        .map(
          (d: any) =>
            `  Line ${d.startLineNumber}: [${d.severity}] ${d.message}`
        )
        .join("\n")}`
    );
  if (context) contextParts.push(`\nProject context: ${context}`);

  const systemPrompt = contextParts.join("\n");

  // ── Build the message chain ──
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...history.map((h: any) => ({
      role: h.role as "user" | "assistant",
      content: h.content,
    })),
    { role: "user", content: message },
  ];

  const toolActivity: ToolActivity[] = [];

  try {
    // ── Tool-call loop ──
    // The LLM may return tool_calls. We execute them, feed results back,
    // and call the LLM again. This repeats until the LLM returns a
    // final text response (no more tool_calls) or we hit the iteration cap.

    let iteration = 0;

    while (iteration < MAX_TOOL_ITERATIONS) {
      iteration++;

      const completion = await openai.chat.completions.create({
        model: config.model,
        max_completion_tokens: 8192,
        messages,
        tools: TOOL_DEFINITIONS,
        tool_choice: "auto",
      });

      const choice = completion.choices[0];
      if (!choice) break;

      const assistantMessage = choice.message;

      // Append the full assistant message (including any tool_calls) to the chain
      messages.push(assistantMessage);

      // If no tool calls, we're done — the assistant gave a final answer
      if (
        !assistantMessage.tool_calls ||
        assistantMessage.tool_calls.length === 0
      ) {
        break;
      }

      // Execute each tool call and feed results back
      for (const toolCall of assistantMessage.tool_calls) {
        // OpenAI SDK v6 union type — only process function-type tool calls
        if (toolCall.type !== "function") continue;

        const fnName = (toolCall as any).function.name as string;
        let fnArgs: Record<string, any> = {};

        try {
          fnArgs = JSON.parse((toolCall as any).function.arguments);
        } catch {
          fnArgs = {};
        }

        req.log.info(
          { tool: fnName, args: fnArgs },
          "AI executing tool"
        );

        const result = await executeTool(fnName, fnArgs, projectId || "");

        toolActivity.push({
          tool: fnName,
          args: fnArgs,
          result: result.slice(0, 2000), // Truncate for the frontend activity log
        });

        // Feed the tool result back into the conversation
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: result.slice(0, 8000), // Truncate to avoid token overflow
        });
      }
    }

    // Extract the final text response from the last assistant message
    const lastAssistant = [...messages]
      .reverse()
      .find((m) => m.role === "assistant");
    const responseMessage =
      (lastAssistant &&
        "content" in lastAssistant &&
        typeof lastAssistant.content === "string" &&
        lastAssistant.content) ||
      "I completed the requested actions.";

    // Determine which files were modified so the frontend can refresh
    const modifiedFiles = toolActivity
      .filter((t) => ["write_file", "create_file", "delete_file"].includes(t.tool))
      .map((t) => t.args.path)
      .filter(Boolean);

    res.json({
      message: responseMessage,
      toolActivity,
      modifiedFiles,
      suggestions: [],
    });
  } catch (err: any) {
    req.log.error({ err }, "AI chat error");
    const errorMsg = err.message?.includes("401")
      ? "Invalid API key. Check your key in Settings → AI Provider."
      : err.message?.includes("404")
        ? `Model "${config.model}" not found for provider "${config.provider}". Check Settings → AI Provider.`
        : "Failed to get AI response. Check your API key and provider settings.";
    res.status(500).json({ error: "ai_error", message: errorMsg });
  }
});

export default router;
