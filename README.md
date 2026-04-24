# clipboard-vision-mcp

> Add vision to text-only models in Opencode (DeepSeek V4, GLM 5.1, Qwen, Kimi, ...) — **see the image in your clipboard directly**, no manual file saving.

**The problem.** Cheap/fast text-only models like DeepSeek V4, GLM, Qwen, or Kimi are amazing for code, but they cannot read images. Every time you paste a screenshot, the model asks you to save it to disk and provide a path.

**The fix.** This MCP server exposes a set of `*_from_clipboard` tools. When the LLM wants to see your screenshot, it calls `analyze_clipboard` — the server reads the clipboard image, sends it to a real vision model (**Groq + Llama-4 Scout, free**), and returns a text description the text model can reason about.

Result: paste → ask → done. No file shuffling.

---

## Features

- 🖼️ **Clipboard-first** — `analyze_clipboard`, `extract_text_from_clipboard`, `diagnose_error_from_clipboard`, `describe_ui_from_clipboard`, `code_from_clipboard`.
- 📁 **File path fallback** — same tools available for images already on disk.
- 🆓 **Free vision backend** — Groq's free tier with Llama-4 Scout (17B, multimodal).
- 🖥️ **Multi-OS** — Windows, macOS, Linux (X11 and Wayland).
- 🔌 **MCP standard** — works with Opencode, Claude Code, Cursor, Cline, Continue, or any MCP-capable client.

---

## Quick start

### 1. Get a free Groq API key
https://console.groq.com/keys — takes 30 seconds.

### 2. Install

```bash
git clone https://github.com/Capetlevrai/clipboard-vision-mcp.git
cd clipboard-vision-mcp
pip install -e .
```

### 3. OS-specific clipboard deps

| OS | Requirement | Notes |
|---|---|---|
| **Windows** | nothing extra | Pillow handles the clipboard natively. |
| **macOS** | `brew install pngpaste` (optional fallback) | Pillow works in most cases; `pngpaste` is used as a backup. |
| **Linux (Wayland)** | `sudo apt install wl-clipboard` | Needed for `wl-paste`. |
| **Linux (X11)** | `sudo apt install xclip` | Or any distro equivalent. |

### 4. Configure your MCP client

See [docs/OPENCODE.md](docs/OPENCODE.md) for Opencode (Windows-tested) or [docs/CLIENTS.md](docs/CLIENTS.md) for Claude Code, Cursor, Cline, etc.

**Opencode** (`~/.config/opencode/opencode.json` on Linux/macOS, `%APPDATA%\opencode\opencode.json` on Windows):

```json
{
  "mcp": {
    "clipboard-vision": {
      "type": "local",
      "command": ["python", "-m", "clipboard_vision_mcp"],
      "environment": {
        "GROQ_API_KEY": "gsk_your_key_here"
      },
      "enabled": true
    }
  }
}
```

### 5. ⚠️ Opencode keybindings for pasting images

Opencode does **not** bind image-paste to `Ctrl+V` / `Alt+V` by default. You need to configure it once — otherwise your screenshot will arrive as plain text (or not at all).

Edit your Opencode keybindings (`~/.config/opencode/keybinds.json` or the `keybinds` section of `opencode.json`):

```json
{
  "keybinds": {
    "input_paste": "ctrl+v",
    "input_paste_image": "alt+v"
  }
}
```

Adjust to taste — the important part is **having a binding** so clipboard images actually get captured. Restart Opencode after editing.

---

## 🤖 One-prompt install via AI

Instead of running the steps manually, you can paste one of these prompts into any coding assistant (DeepSeek, GLM, Claude, GPT, ...) and it will set everything up for you:

- 🇬🇧 [docs/INSTALL_PROMPT_EN.md](docs/INSTALL_PROMPT_EN.md)
- 🇫🇷 [docs/INSTALL_PROMPT_FR.md](docs/INSTALL_PROMPT_FR.md)

---

## Usage

Once the MCP server is wired to your client:

```
You: (copy a screenshot to clipboard, then type)
     "Look at what I just copied and tell me what's wrong with this error."

LLM (DeepSeek, GLM, Claude, ...): [calls diagnose_error_from_clipboard]
     → "The error says `ECONNREFUSED 127.0.0.1:5432`. Postgres isn't
        running on port 5432. Start it with: ..."
```

The text-only model never sees pixels — it reads the description returned by Llama-4 Scout and reasons over it.

### Tool reference

| Tool | Input | Use when |
|---|---|---|
| `analyze_clipboard` | optional `prompt` | Generic description, Q&A on the clipboard image. |
| `extract_text_from_clipboard` | — | Pure OCR. |
| `describe_ui_from_clipboard` | — | UI/UX review, component inventory. |
| `diagnose_error_from_clipboard` | — | Error screenshot → cause + fix. |
| `code_from_clipboard` | — | Extract code from a screenshot. |
| `analyze_image` | `image_path`, optional `prompt` | Image already on disk. |
| `extract_text`, `describe_ui`, `diagnose_error`, `understand_diagram`, `analyze_chart`, `code_from_screenshot` | `image_path` | Same as above for files. |

---

## How it works

```
┌──────────────┐   MCP   ┌─────────────────┐   HTTPS   ┌─────────────────┐
│  Opencode    │ ──────▶ │  clipboard-     │ ────────▶ │  Groq API       │
│  (DeepSeek)  │         │  vision-mcp     │           │  Llama-4 Scout  │
└──────────────┘         └─────────────────┘           └─────────────────┘
                              │
                              ▼
                     reads system clipboard
                     (PIL / wl-paste / xclip)
```

The server is a plain stdio MCP process. It reads the clipboard on demand, writes a temp PNG to `$TMPDIR/clipboard_vision_mcp/`, base64-encodes it, and sends it to Groq's OpenAI-compatible endpoint.

---

## Troubleshooting

- **"Clipboard does not contain an image."** — Copy an actual image, not just a file path or text. On Linux, verify `wl-paste --type image/png` or `xclip -selection clipboard -t image/png -o | file -` works outside the MCP.
- **"GROQ_API_KEY is not set."** — Confirm the `environment` block in your client config, then restart the client fully.
- **Opencode doesn't list the tools.** — Check the client's MCP log. Run `python -m clipboard_vision_mcp` manually — it should start and wait silently on stdin.

---

## Contributing

PRs welcome. Ideas: support Anthropic/OpenAI as alternate backends, add a `watch_clipboard` mode, ship pre-built wheels.

## License

MIT — see [LICENSE](LICENSE).
