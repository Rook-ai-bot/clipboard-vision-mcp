/**
 * Vision client: sends images to Groq's vision model for analysis.
 */

import { readFileSync } from "node:fs";
import { statSync } from "node:fs";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import Groq from "groq-sdk";

// Security: only allow image files, bound size to prevent prompt-injected caller
// from exfiltrating arbitrary local files as base64.
const ALLOWED_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"]);
const MAX_IMAGE_BYTES = 20 * 1024 * 1024; // 20 MB

const IMAGE_MAGIC_PREFIXES: Buffer[] = [
  Buffer.from("\x89PNG\r\n\x1a\n"), // PNG
  Buffer.from("\xff\xd8\xff"), // JPEG
  Buffer.from("GIF87a"),
  Buffer.from("GIF89a"),
  Buffer.from("RIFF"), // WEBP (RIFF....WEBP)
  Buffer.from("BM"), // BMP
];

export function validateImagePath(pathStr: string): string {
  const p = resolve(pathStr);
  if (!existsSync(p)) {
    throw new Error(`Not a file: ${pathStr}`);
  }
  const stat = statSync(p);
  if (!stat.isFile()) {
    throw new Error(`Not a file: ${pathStr}`);
  }
  const ext = p.substring(p.lastIndexOf(".")).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error(
      `Refusing to read '${ext}' — only image files are allowed (${[...ALLOWED_EXTENSIONS].sort().join(", ")}).`
    );
  }
  if (stat.size > MAX_IMAGE_BYTES) {
    throw new Error(`Image too large: ${stat.size} bytes (max ${MAX_IMAGE_BYTES}).`);
  }
  return p;
}

export function validateMagic(data: Buffer): void {
  if (!IMAGE_MAGIC_PREFIXES.some((prefix) => data.subarray(0, prefix.length).equals(prefix))) {
    throw new Error("File content does not look like a supported image.");
  }
}

export interface VisionClient {
  analyze(imagePath: string, prompt: string): Promise<string>;
}

export function createVisionClient(apiKey: string, model: string): VisionClient {
  const groq = new Groq({ apiKey });

  return {
    async analyze(imagePath: string, prompt: string): Promise<string> {
      const validatedPath = validateImagePath(imagePath);
      const data = readFileSync(validatedPath);
      validateMagic(data);
      const b64 = data.toString("base64");

      const mime = guessMime(data);

      const response = await groq.chat.completions.create({
        model,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: { url: `data:${mime};base64,${b64}` },
              },
            ],
          },
        ],
        temperature: 0.5,
        max_tokens: 2048,
      });

      return response.choices[0]?.message?.content || "";
    },
  };
}

function guessMime(data: Buffer): string {
  if (data.subarray(0, 4).equals(Buffer.from("\x89PNG"))) return "image/png";
  if (data.subarray(0, 3).equals(Buffer.from("\xff\xd8\xff"))) return "image/jpeg";
  if (data.subarray(0, 6).equals(Buffer.from("GIF87a")) || data.subarray(0, 6).equals(Buffer.from("GIF89a")))
    return "image/gif";
  if (data.subarray(0, 4).equals(Buffer.from("RIFF"))) return "image/webp";
  if (data.subarray(0, 2).equals(Buffer.from("BM"))) return "image/bmp";
  return "image/png";
}
