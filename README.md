# @karnak19/clipboard-vision-mcp

> 🇫🇷 **[Version française → README.fr.md](README.fr.md)**

> Add vision to text-only models in OpenCode (**DeepSeek V4**, **GLM 5.1**) — **see the image in your clipboard directly**, no manual file saving.

**Zero install.** Just add 4 lines to your OpenCode config and paste a screenshot.

Fork of [Capetlevrai/clipboard-vision-mcp](https://github.com/Capetlevrai/clipboard-vision-mcp) (itself forked from [itcomgroup/vision-mcp-server](https://github.com/itcomgroup/vision-mcp-server)) — rewritten in **TypeScript + Bun**.

---

## Quick start

### 1. Get a free Groq API key

https://console.groq.com/keys (30 seconds sign-up, free tier)

### 2. Add to your OpenCode config

`~/.config/opencode/opencode.json` (Linux/macOS) or `%APPDATA%\opencode\opencode.json` (Windows):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "clipboard-vision": {
      "type": "local",
      "command": ["bunx", "@karnak19/clipboard-vision-mcp"],
      "environment": {
        "GROQ_API_KEY": "gsk_your_key_here"
      }
    }
  }
}
```

That's it. Restart OpenCode.

> **Requires [Bun](https://bun.sh)** (`bunx` is Bun's equivalent of `npx`). Install with `curl -fsSL https://bun.sh/install | bash`.

### 3. (Optional) Opencode image paste keybind

Opencode doesn't bind image-paste by default. Add this to your config:

```json
{
  "keybinds": {
    "input_paste": "ctrl+v",
    "input_paste_image": "alt+v"
  }
}
```

---

## How it works

When your text-only model (DeepSeek, GLM, Qwen, ...) needs to see an image:

1. You paste a screenshot (`Alt+V` in OpenCode)
2. The model calls `analyze_clipboard`
3. This MCP server reads your clipboard, sends the image to **Groq + Llama-4 Scout** (free)
4. Groq returns a text description that the text model can reason over

```
paste → ask → done. No file shuffling.
```

---

## Tools

### Clipboard tools (no file needed)

| Tool | Input | Use when |
|---|---|---|
| `analyze_clipboard` | optional `prompt` | Generic description, Q&A on the clipboard image |
| `extract_text_from_clipboard` | — | Pure OCR |
| `describe_ui_from_clipboard` | — | UI/UX review, component inventory |
| `diagnose_error_from_clipboard` | — | Error screenshot → cause + fix |
| `code_from_clipboard` | — | Extract code from a screenshot |

### File-path tools (image already on disk)

| Tool | Input | Use when |
|---|---|---|
| `analyze_image` | `image_path`, optional `prompt` | Generic analysis of a file |
| `extract_text` | `image_path` | OCR a file |
| `describe_ui` | `image_path` | Describe a UI screenshot file |
| `diagnose_error` | `image_path` | Diagnose an error screenshot file |
| `understand_diagram` | `image_path` | Interpret a diagram |
| `analyze_chart` | `image_path` | Analyze a chart |
| `code_from_screenshot` | `image_path` | Extract code from a screenshot file |

---

## Other MCP clients

**Claude Code** (`~/.claude/settings.json`):

```json
{
  "mcpServers": {
    "clipboard-vision": {
      "command": "bunx",
      "args": ["@karnak19/clipboard-vision-mcp"],
      "env": {
        "GROQ_API_KEY": "gsk_your_key_here"
      }
    }
  }
}
```

---

## OS-specific clipboard requirements

| OS | Extra install? | Notes |
|---|---|---|
| **Windows** | No | PowerShell handles it natively |
| **macOS** | `brew install pngpaste` *(optional)* | osascript works in most cases |
| **Linux — Wayland** | `sudo apt install wl-clipboard` | Provides `wl-paste` |
| **Linux — X11** | `sudo apt install xclip` | Or your distro equivalent |

---

## Optional: override vision model

```bash
GROQ_API_KEY=gsk_xxx VISION_MODEL=meta-llama/llama-4-maverick-17b-128e-instruct bunx @karnak19/clipboard-vision-mcp
```

Default: `meta-llama/llama-4-scout-17b-16e-instruct`

---

## Security

- **Local stdio only** — no network port opened, talks only to your MCP client + Groq HTTPS
- **File type allow-list** — only `.png .jpg .jpeg .gif .webp .bmp`
- **Magic-byte validation** — content checked against image headers before upload
- **20 MB size cap** per image
- **Auto-delete clipboard temp files** after analysis (screenshots may contain secrets)
- **No telemetry** — zero analytics, zero phone-home

---

## Troubleshooting

- **"Clipboard does not contain an image."** — Copy an actual image, not a file icon or text
- **"GROQ_API_KEY is not set."** — Check the `environment` block in your config, restart the client
- **Tools don't appear** — Run `GROQ_API_KEY=test bunx @karnak19/clipboard-vision-mcp` manually; it should start silently on stdin
- **"Refusing to read '.env'"** — Security guard working as expected; only image files are allowed

---

## Credits

- Original: [itcomgroup/vision-mcp-server](https://github.com/itcomgroup/vision-mcp-server) + [Capetlevrai/clipboard-vision-mcp](https://github.com/Capetlevrai/clipboard-vision-mcp)
- Vision model: [Llama-4 Scout](https://groq.com/) served by Groq

## License

MIT
