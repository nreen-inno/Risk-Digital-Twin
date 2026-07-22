import OpenAI from "openai";

const {
  AZURE_OPENAI_ENDPOINT,
  AZURE_OPENAI_API_KEY,
  AZURE_OPENAI_DEPLOYMENT
} = process.env;

if (!AZURE_OPENAI_ENDPOINT) {
  throw new Error("Missing AZURE_OPENAI_ENDPOINT in .env");
}

if (!AZURE_OPENAI_API_KEY) {
  throw new Error("Missing AZURE_OPENAI_API_KEY in .env");
}

if (!AZURE_OPENAI_DEPLOYMENT) {
  throw new Error("Missing AZURE_OPENAI_DEPLOYMENT in .env");
}

const aiClient = new OpenAI({
  apiKey: AZURE_OPENAI_API_KEY,
  baseURL: AZURE_OPENAI_ENDPOINT
});

export {
  aiClient,
  AZURE_OPENAI_DEPLOYMENT
};
