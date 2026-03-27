import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { db, settingsTable } from "@workspace/db";

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

async function getAiConfig() {
  const rows = await db.select().from(settingsTable);
  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }

  const provider = settings["ai_provider"] || "openai";
  const apiKey = settings["ai_api_key"] || "";
  const baseURL = settings["ai_base_url"] || PROVIDER_URLS[provider] || PROVIDER_URLS.openai;
  const model = settings["ai_model"] || DEFAULT_MODELS[provider] || "gpt-4o";

  return { provider, apiKey, baseURL, model };
}

router.post("/ai/chat", async (req, res): Promise<void> => {
  const { message, context, fileContent, filePath, history = [] } = req.body;

  if (!message) {
    res.status(400).json({ error: "bad_request", message: "message is required" });
    return;
  }

  const config = await getAiConfig();

  if (!config.apiKey) {
    res.status(400).json({
      error: "no_api_key",
      message: "No AI API key configured. Go to Settings → AI Provider to add your key.",
    });
    return;
  }

  const openai = new OpenAI({
    baseURL: config.baseURL,
    apiKey: config.apiKey,
  });

  const systemPrompt = `You are an expert coding assistant built into Softcurse LiveScriptor IDE.
You help developers write, debug, and improve their code.
You provide concise, practical answers with code examples when helpful.
Format code blocks with proper syntax.
${filePath ? `Current file: ${filePath}` : ""}
${fileContent ? `\nCurrent file content:\n\`\`\`\n${fileContent.slice(0, 3000)}\n\`\`\`` : ""}
${context ? `\nProject context: ${context}` : ""}`;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...history.map((h: any) => ({ role: h.role as "user" | "assistant", content: h.content })),
    { role: "user", content: message },
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: config.model,
      max_completion_tokens: 8192,
      messages,
    });

    const responseMessage = completion.choices[0]?.message?.content || "I couldn't generate a response.";

    res.json({
      message: responseMessage,
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
