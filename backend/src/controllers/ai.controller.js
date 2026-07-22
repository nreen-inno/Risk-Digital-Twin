import {
  aiClient,
  AZURE_OPENAI_DEPLOYMENT
} from "../config/ai.js";

export async function testAiConnection(req, res, next) {
  try {
    const response = await aiClient.responses.create({
      model: AZURE_OPENAI_DEPLOYMENT,
      input: "Reply with exactly: AI connection successful"
    });

    res.status(200).json({
      status: "ok",
      model: AZURE_OPENAI_DEPLOYMENT,
      response: response.output_text
    });
  } catch (error) {
    next(error);
  }
}
