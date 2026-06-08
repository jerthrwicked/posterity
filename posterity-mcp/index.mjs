import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "..", ".env.local") });

const CONTEXT_PATH = path.join(__dirname, "..", "CONTEXT_for_posterity.md");

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const server = new McpServer({ name: "posterity-claude", version: "1.0.0" });

server.tool(
  "ask_posterity",
  "Ask a question about the Posterity project. Returns an answer with full knowledge of all project decisions, rules, phases, pricing, architecture, and current build status. Call this before making any decision that touches product logic, phase language, pricing, copy, or architecture.",
  { question: z.string().describe("Your question about the Posterity project") },
  async ({ question }) => {
    const context = fs.readFileSync(CONTEXT_PATH, "utf-8");

    const response = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1024,
      system: [
        {
          type: "text",
          text: "You are the authoritative knowledge source for the Posterity project. Answer questions based strictly on the context document. Never contradict decisions in the context. Never use clinical mortality language in customer-facing contexts. Accounts move through phases — plans do not. Be concise and direct.",
          cache_control: { type: "ephemeral" }
        },
        {
          type: "text",
          text: `POSTERITY CONTEXT:\n\n${context}`,
          cache_control: { type: "ephemeral" }
        }
      ],
      messages: [{ role: "user", content: question }]
    });

    return {
      content: [{ type: "text", text: response.content[0].text }]
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
