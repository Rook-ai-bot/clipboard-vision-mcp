/**
 * Cross-platform clipboard image extraction.
 *
 * Windows: PowerShell command to save clipboard bitmap to file.
 * macOS:   osascript (AppleScript) to save clipboard image, falls back to pngpaste.
 * Linux:   wl-paste (Wayland) or xclip (X11).
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

export class ClipboardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClipboardError";
  }
}

function tempPath(): string {
  const dir = join(tmpdir(), "clipboard_vision_mcp");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return join(dir, `clip_${randomUUID().replace(/-/g, "")}.png`);
}

/**
 * Save the current clipboard image to a temp PNG and return its path.
 * Raises ClipboardError if the clipboard does not contain an image.
 */
export function saveClipboardImage(): string {
  const out = tempPath();
  const platform = process.platform;

  try {
    if (platform === "win32") {
      grabWindows(out);
    } else if (platform === "darwin") {
      try {
        grabMacosOsascript(out);
      } catch {
        grabMacosPngpaste(out);
      }
    } else {
      grabLinux(out);
    }
  } catch (err) {
    if (err instanceof ClipboardError) throw err;
    throw new ClipboardError(
      `Failed to read clipboard: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!existsSync(out) || statSync(out).size === 0) {
    throw new ClipboardError("Clipboard does not contain an image.");
  }

  return out;
}

function grabWindows(out: string): void {
  // Use PowerShell to save clipboard bitmap to PNG file
  const safeOut = out.replace(/'/g, "''");
  const psScript = [
    "Add-Type -AssemblyName System.Windows.Forms",
    "Add-Type -AssemblyName System.Drawing",
    "$img = [System.Windows.Forms.Clipboard]::GetImage()",
    "if ($img -eq $null) { exit 1 }",
    `$img.Save('${safeOut}', [System.Drawing.Imaging.ImageFormat]::Png)`,
    "exit 0",
  ].join("\n");

  const tryPowerShell = (cmd: string) => {
    execFileSync(cmd, ["-NoProfile", "-Command", psScript], {
      timeout: 15000,
      encoding: "utf-8",
    });
  };

  try {
    tryPowerShell("powershell");
  } catch {
    try {
      tryPowerShell("pwsh");
    } catch {
      throw new ClipboardError(
        "No image found in clipboard. Ensure an image is copied to the clipboard.",
      );
    }
  }

  if (!existsSync(out)) {
    throw new ClipboardError("No image found in clipboard.");
  }
}

function grabMacosOsascript(out: string): void {
  const script = [
    `set pngData to (the clipboard as «class PNGf»)`,
    `set fp to open for access POSIX file "${out}" with write permission`,
    `try`,
    `    write pngData to fp`,
    `end try`,
    `close access fp`,
  ].join("\n");

  try {
    execFileSync("osascript", ["-e", script], { timeout: 10000 });
  } catch {
    throw new ClipboardError("No image found in clipboard via osascript.");
  }
}

function grabMacosPngpaste(out: string): void {
  try {
    execFileSync("pngpaste", [out], { timeout: 10000 });
    if (!existsSync(out)) {
      throw new ClipboardError("pngpaste returned no data.");
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      throw new ClipboardError(
        "No image in clipboard. Install pngpaste for better support: brew install pngpaste",
      );
    }
    throw new ClipboardError("No image in clipboard (pngpaste failed).");
  }
}

function grabLinux(out: string): void {
  const attempts: { cmd: string; args: string[]; pkg: string }[] = [
    { cmd: "wl-paste", args: ["--type", "image/png"], pkg: "wl-clipboard" },
    {
      cmd: "xclip",
      args: ["-selection", "clipboard", "-t", "image/png", "-o"],
      pkg: "xclip",
    },
  ];

  const errors: string[] = [];

  for (const { cmd, args, pkg } of attempts) {
    try {
      const buf = execFileSync(cmd, args, { timeout: 10000, maxBuffer: 50 * 1024 * 1024 });
      if (buf && buf.length > 0) {
        writeFileSync(out, buf);
        return;
      }
      errors.push(`${pkg} returned no image`);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        errors.push(`${pkg} not installed`);
      } else {
        errors.push(`${pkg}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  throw new ClipboardError(
    `No image in clipboard. Install one of: wl-clipboard (Wayland) or xclip (X11). Attempts: ${errors.join(", ")}`,
  );
}
