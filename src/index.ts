#!/usr/bin/env bun
/**
 * @karnak19/clipboard-vision-mcp — MCP server exposing vision tools backed by Groq + Llama-4 Scout.
 *
 * Two families of tools:
 *   - *_from_path       : analyze an image file on disk.
 *   - *_from_clipboard  : read the image directly from the system clipboard.
 *
 * The clipboard tools are the main reason this project exists: they let any
 * text-only LLM (DeepSeek, GLM, Qwen, ...) "see" an image the user just copied,
 * without asking them to save a file first.
 */

import { unlinkSync } from "node:fs";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { saveClipboardImage } from "./clipboard.js";
import { createVisionClient, type VisionClient } from "./vision.js";

const SERVER_NAME = "clipboard-vision-mcp";
const SERVER_VERSION = "0.2.0";
const VISION_MODEL = process.env.VISION_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct";

// ─── Prompt templates (same as Python version) ───────────────────────────

const PROMPTS: Record<string, string> = {
  analyze:
    "Describe this image in detail. Identify all relevant elements, context, and anything that would help someone who cannot see it.",
  extract_text:
    "Extract ALL text from this image. Return only the text, preserving layout and line breaks. No commentary.",
  describe_ui:
    "Analyze this UI screenshot. Describe: 1) overall layout, 2) components (buttons, forms, navigation, inputs), 3) visible text and labels, 4) state (errors, active tabs, modals).",
  diagnose_error:
    "Analyze this error screenshot. Return: 1) the exact error message, 2) the likely cause, 3) concrete steps to fix it, 4) how to prevent recurrence.",
  understand_diagram:
    "Interpret this diagram. Return: 1) diagram type, 2) components and their roles, 3) relationships/flow, 4) the overall purpose.",
  analyze_chart:
    "Analyze this chart. Return: 1) chart type, 2) axes and labels, 3) key trends, 4) notable data points, 5) insights.",
  code_from_screenshot:
    "Extract all code from this screenshot. Return: 1) language, 2) clean code in a fenced code block preserving indentation.",
};

// ─── Server setup ────────────────────────────────────────────────────────

const server = new McpServer({
  name: SERVER_NAME,
  version: SERVER_VERSION,
});

let visionClient: VisionClient | null = null;

const apiKey = process.env.GROQ_API_KEY;
if (apiKey) {
  visionClient = createVisionClient(apiKey, VISION_MODEL);
}

async function runPrompt(promptKey: string, imagePath: string, override?: string): Promise<string> {
  if (!visionClient) {
    return "Error: GROQ_API_KEY is not set. Get a free key at https://console.groq.com/keys";
  }
  const prompt = override || PROMPTS[promptKey];
  return visionClient.analyze(imagePath, prompt);
}

async function runClipboard(promptKey: string, override?: string): Promise<string> {
  let path: string;
  try {
    path = saveClipboardImage();
  } catch (err) {
    return `Clipboard error: ${err instanceof Error ? err.message : String(err)}`;
  }
  try {
    return await runPrompt(promptKey, path, override);
  } finally {
    // Privacy: delete temp clipboard file immediately after analysis
    try {
      unlinkSync(path);
    } catch {
      // ignore cleanup errors
    }
  }
}

function textResult(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

function errorResult(e: unknown) {
  return { content: [{ type: "text" as const, text: `Error: ${e}` }] };
}

// ─── Register tools ──────────────────────────────────────────────────────

// Clipboard-first tools (the reason this project exists)
server.tool(
  "analyze_clipboard",
  "Read the image currently in the system clipboard and analyze it. Use this when the user says 'look at this', 'what's in my clipboard', or pastes a screenshot without providing a file path. Optional `prompt` overrides the default description request.",
  {
    prompt: z.string().optional().describe("Custom question about the clipboard image."),
  },
  async (args) => {
    try {
      const text = await runClipboard("analyze", args.prompt);
      return textResult(text);
    } catch (e) {
      return errorResult(e);
    }
  },
);

server.tool(
  "extract_text_from_clipboard",
  "OCR the image currently in the clipboard and return only its text.",
  {},
  async () => {
    try {
      const text = await runClipboard("extract_text");
      return textResult(text);
    } catch (e) {
      return errorResult(e);
    }
  },
);

server.tool(
  "describe_ui_from_clipboard",
  "Describe the UI in a clipboard screenshot (layout, components, state).",
  {},
  async () => {
    try {
      const text = await runClipboard("describe_ui");
      return textResult(text);
    } catch (e) {
      return errorResult(e);
    }
  },
);

server.tool(
  "diagnose_error_from_clipboard",
  "Diagnose an error screenshot from the clipboard and propose fixes.",
  {},
  async () => {
    try {
      const text = await runClipboard("diagnose_error");
      return textResult(text);
    } catch (e) {
      return errorResult(e);
    }
  },
);

server.tool(
  "code_from_clipboard",
  "Extract code from a clipboard screenshot, identifying the language.",
  {},
  async () => {
    try {
      const text = await runClipboard("code_from_screenshot");
      return textResult(text);
    } catch (e) {
      return errorResult(e);
    }
  },
);

// File-path tools (for when the image is already saved)
server.tool(
  "analyze_image",
  "Analyze an image file. Provide `image_path` and optional `prompt`.",
  {
    image_path: z.string().describe("Absolute path to the image file."),
    prompt: z.string().optional().describe("Custom question about the image."),
  },
  async (args) => {
    try {
      const text = await runPrompt("analyze", args.image_path, args.prompt);
      return textResult(text);
    } catch (e) {
      return errorResult(e);
    }
  },
);

server.tool(
  "extract_text",
  "OCR an image file.",
  {
    image_path: z.string().describe("Absolute path to the image file."),
  },
  async (args) => {
    try {
      const text = await runPrompt("extract_text", args.image_path);
      return textResult(text);
    } catch (e) {
      return errorResult(e);
    }
  },
);

server.tool(
  "describe_ui",
  "Describe a UI screenshot file.",
  {
    image_path: z.string().describe("Absolute path to the image file."),
  },
  async (args) => {
    try {
      const text = await runPrompt("describe_ui", args.image_path);
      return textResult(text);
    } catch (e) {
      return errorResult(e);
    }
  },
);

server.tool(
  "diagnose_error",
  "Diagnose an error screenshot file.",
  {
    image_path: z.string().describe("Absolute path to the image file."),
  },
  async (args) => {
    try {
      const text = await runPrompt("diagnose_error", args.image_path);
      return textResult(text);
    } catch (e) {
      return errorResult(e);
    }
  },
);

server.tool(
  "understand_diagram",
  "Interpret a diagram image file.",
  {
    image_path: z.string().describe("Absolute path to the image file."),
  },
  async (args) => {
    try {
      const text = await runPrompt("understand_diagram", args.image_path);
      return textResult(text);
    } catch (e) {
      return errorResult(e);
    }
  },
);

server.tool(
  "analyze_chart",
  "Analyze a chart image file.",
  {
    image_path: z.string().describe("Absolute path to the image file."),
  },
  async (args) => {
    try {
      const text = await runPrompt("analyze_chart", args.image_path);
      return textResult(text);
    } catch (e) {
      return errorResult(e);
    }
  },
);

server.tool(
  "code_from_screenshot",
  "Extract code from a screenshot file.",
  {
    image_path: z.string().describe("Absolute path to the image file."),
  },
  async (args) => {
    try {
      const text = await runPrompt("code_from_screenshot", args.image_path);
      return textResult(text);
    } catch (e) {
      return errorResult(e);
    }
  },
);

// ─── Start ───────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal error starting MCP server:", err);
  process.exit(1);
});
