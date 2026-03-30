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
  ollama: "http://localhost:11434/v1",
  lmstudio: "http://localhost:1234/v1",
};

/** Default models per provider */
const DEFAULT_MODELS: Record<string, string> = {
  openai: "gpt-4o",
  openrouter: "openai/gpt-4o",
  gemini: "gemini-2.5-flash",
  grok: "grok-3",
  ollama: "llama3.1",
  lmstudio: "local-model",
};

/** Maximum number of tool-call loop iterations to prevent runaway chains */
const MAX_TOOL_ITERATIONS = 10;

/** Tool names we recognize */
const VALID_TOOL_NAMES = new Set(
  TOOL_DEFINITIONS.map((t) => (t as any).function.name)
);

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

/**
 * Parse tool calls from the AI's text output.
 * Many local LLMs (Ollama, LM Studio) don't use the native tool_calls field —
 * they just print JSON objects like {"name": "tool_name", "parameters": {...}}
 * directly in their text response. This parser extracts and executes them.
 */
function parseTextToolCalls(
  text: string
): Array<{ name: string; args: Record<string, any> }> {
  const calls: Array<{ name: string; args: Record<string, any> }> = [];

  // Pattern 1: {"name": "tool_name", "parameters": {...}}
  const jsonPattern =
    /\{\s*"name"\s*:\s*"([^"]+)"\s*,\s*"parameters"\s*:\s*(\{[^}]*\})\s*\}/g;
  let match;
  while ((match = jsonPattern.exec(text)) !== null) {
    const name = match[1];
    if (VALID_TOOL_NAMES.has(name)) {
      try {
        const args = JSON.parse(match[2]);
        calls.push({ name, args });
      } catch {
        calls.push({ name, args: {} });
      }
    }
  }

  // Pattern 2: tool_name(arg1="val1", arg2="val2") or tool_name("path")
  if (calls.length === 0) {
    const fnCallPattern = /\b(get_file_content|list_directory|get_project_structure|search_in_files|write_file|create_file|delete_file|run_command)\s*\(\s*([^)]*)\)/g;
    while ((match = fnCallPattern.exec(text)) !== null) {
      const name = match[1];
      const rawArgs = match[2].trim();
      const args: Record<string, any> = {};

      if (rawArgs) {
        // Try to parse as JSON first
        try {
          const parsed = JSON.parse(`{${rawArgs}}`);
          Object.assign(args, parsed);
        } catch {
          // Try key=value pairs: path="/src/index.js"
          const kvPattern = /(\w+)\s*=\s*"([^"]*)"/g;
          let kvMatch;
          while ((kvMatch = kvPattern.exec(rawArgs)) !== null) {
            args[kvMatch[1]] = kvMatch[2];
          }
          // If still empty, treat the whole thing as a path argument
          if (Object.keys(args).length === 0) {
            const stripped = rawArgs.replace(/['"]/g, "").trim();
            if (stripped) args.path = stripped;
          }
        }
      }

      calls.push({ name, args });
    }
  }

  return calls;
}

/**
 * Remove tool call JSON from the AI's text so we can show clean output
 */
function stripToolCallText(text: string): string {
  // Remove JSON-format tool calls
  let cleaned = text.replace(
    /\{\s*"name"\s*:\s*"[^"]+"\s*,\s*"parameters"\s*:\s*\{[^}]*\}\s*\}/g,
    ""
  );
  // Remove lines like "Getting project structure..." or "Let me call..."
  cleaned = cleaned.replace(
    /^.*(?:Getting|Calling|Let me (?:call|use|get|read|run)|I (?:will|need to) (?:call|use|first)).*$/gim,
    ""
  );
  // Remove excessive blank lines
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n").trim();
  return cleaned;
}

/** Build a markdown-formatted summary of all tools available */
function getToolSummaryForPrompt(): string {
  return TOOL_DEFINITIONS.map((t) => {
    const fn = (t as any).function;
    const params = fn.parameters as any;
    const paramNames = params?.properties
      ? Object.keys(params.properties)
      : [];
    return `- ${fn.name}(${paramNames.join(", ")}): ${fn.description}`;
  }).join("\n");
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

  // Local LLM providers (Ollama, LM Studio) don't require API keys
  const LOCAL_PROVIDERS = ["ollama", "lmstudio"];
  const isLocal = LOCAL_PROVIDERS.includes(config.provider);

  if (!config.apiKey && !isLocal) {
    res.status(400).json({
      error: "no_api_key",
      message:
        "No AI API key configured. Go to Settings → AI Provider to add your key.",
    });
    return;
  }

  const openai = new OpenAI({
    baseURL: config.baseURL,
    apiKey: config.apiKey || "not-needed",
  });

  // ── Build the system prompt with all available context ──
  const toolSummary = getToolSummaryForPrompt();

  const contextParts: string[] = [
    `You are an expert coding assistant built into the Softcurse LiveScriptor IDE.`,
    `You have powerful tools to interact with the user's project. Here are the tools available:\n${toolSummary}`,
    ``,
    `CRITICAL INSTRUCTIONS FOR USING TOOLS:`,
    `- Do NOT just describe what tools you would use. Actually invoke them.`,
    `- Do NOT show tool calls as text. The system will execute them automatically.`,
    `- Do NOT ask the user to paste code. Read files yourself with get_file_content.`,
    `- When the user asks to fix, create, or modify code, use write_file or create_file directly.`,
    `- When the user asks to run something, use run_command directly.`,
    `- After performing actions, explain what you did and show relevant results.`,
    `- Always start by understanding the project: call get_project_structure first.`,
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
    let iteration = 0;
    let finalText = "";

    while (iteration < MAX_TOOL_ITERATIONS) {
      iteration++;

      // ── Try native tool calling first (works for OpenAI, Gemini, etc.) ──
      let completion;
      let usedNativeTools = false;

      try {
        completion = await openai.chat.completions.create({
          model: config.model,
          max_completion_tokens: 8192,
          messages,
          tools: TOOL_DEFINITIONS,
          tool_choice: "auto",
        });
      } catch (toolErr: any) {
        // If the model doesn't support tools, fall back to plain chat
        req.log.warn({ err: toolErr.message }, "Native tool calling failed, falling back to plain chat");
        completion = await openai.chat.completions.create({
          model: config.model,
          max_completion_tokens: 8192,
          messages,
        });
      }

      const choice = completion.choices[0];
      if (!choice) break;

      const assistantMessage = choice.message;
      const textContent =
        typeof assistantMessage.content === "string"
          ? assistantMessage.content
          : "";

      // ── Path A: Native tool_calls from the API response ──
      if (
        assistantMessage.tool_calls &&
        assistantMessage.tool_calls.length > 0
      ) {
        usedNativeTools = true;
        messages.push(assistantMessage);

        for (const toolCall of assistantMessage.tool_calls) {
          if (toolCall.type !== "function") continue;

          const fnName = (toolCall as any).function.name as string;
          let fnArgs: Record<string, any> = {};
          try {
            fnArgs = JSON.parse((toolCall as any).function.arguments);
          } catch {
            fnArgs = {};
          }

          req.log.info({ tool: fnName, args: fnArgs }, "AI executing tool (native)");
          const result = await executeTool(fnName, fnArgs, projectId || "");

          toolActivity.push({
            tool: fnName,
            args: fnArgs,
            result: result.slice(0, 2000),
          });

          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: result.slice(0, 8000),
          });
        }
        // Loop back to let the LLM see the tool results
        continue;
      }

      // ── Path B: Parse tool calls from the AI's text output (local LLM fallback) ──
      const textCalls = parseTextToolCalls(textContent);

      if (textCalls.length > 0) {
        // Execute each parsed tool call
        const resultLines: string[] = [];

        for (const tc of textCalls) {
          req.log.info(
            { tool: tc.name, args: tc.args },
            "AI executing tool (text-parsed)"
          );
          const result = await executeTool(tc.name, tc.args, projectId || "");

          toolActivity.push({
            tool: tc.name,
            args: tc.args,
            result: result.slice(0, 2000),
          });

          resultLines.push(
            `Tool "${tc.name}" result:\n${result.slice(0, 4000)}`
          );
        }

        // Feed tool results back into the conversation so the LLM can summarize
        messages.push({ role: "assistant", content: textContent });
        messages.push({
          role: "user",
          content: `I executed the tools you requested. Here are the results:\n\n${resultLines.join("\n\n")}\n\nNow provide your analysis or response based on these results. Do NOT repeat the tool calls.`,
        });

        // Loop back for the LLM to see the results
        continue;
      }

      // ── Path C: No tool calls — this is the final text answer ──
      finalText = textContent;
      break;
    }

    // Clean up any lingering tool-call JSON from the final text
    if (toolActivity.length > 0) {
      finalText = stripToolCallText(finalText);
    }

    if (!finalText) {
      finalText = "I completed the requested actions.";
    }

    // Determine which files were modified so the frontend can refresh
    const modifiedFiles = toolActivity
      .filter((t) =>
        ["write_file", "create_file", "delete_file"].includes(t.tool)
      )
      .map((t) => t.args.path)
      .filter(Boolean);

    res.json({
      message: finalText,
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
        : `Failed to get AI response: ${err.message || "Unknown error"}. Check your API key and provider settings.`;
    res.status(500).json({ error: "ai_error", message: errorMsg });
  }
});

export default router;
