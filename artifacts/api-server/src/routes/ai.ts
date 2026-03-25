import { Router, type IRouter } from "express";
import OpenAI from "openai";

const router: IRouter = Router();

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

router.post("/ai/chat", async (req, res): Promise<void> => {
  const { message, context, fileContent, filePath, history = [] } = req.body;

  if (!message) {
    res.status(400).json({ error: "bad_request", message: "message is required" });
    return;
  }

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
      model: "gpt-5.2",
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
    res.status(500).json({ error: "ai_error", message: "Failed to get AI response" });
  }
});

export default router;
