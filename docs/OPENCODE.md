# Opencode setup (Windows, macOS, Linux)

This guide is Windows-focused (tested environment) but works identically on macOS / Linux — only paths differ.

## 1. Install the server

```bash
git clone https://github.com/Capetlevrai/clipboard-vision-mcp.git
cd clipboard-vision-mcp
pip install -e .
```

Verify:

```bash
python -m clipboard_vision_mcp
```

It should start and wait silently on stdin (no output means it's working — that's how MCP stdio servers behave). `Ctrl+C` to exit.

## 2. Locate your Opencode config

| OS | Config path |
|---|---|
| Windows | `%APPDATA%\opencode\opencode.json` |
| macOS | `~/.config/opencode/opencode.json` or `~/Library/Application Support/opencode/opencode.json` |
| Linux | `~/.config/opencode/opencode.json` |

If the file does not exist, create it.

## 3. Add the MCP server

Merge this into the top-level object:

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

If your Python isn't on PATH globally, use the absolute path:

- Windows: `"command": ["C:\\Users\\YOU\\AppData\\Local\\Programs\\Python\\Python312\\python.exe", "-m", "clipboard_vision_mcp"]`
- Unix: `"command": ["/usr/bin/python3", "-m", "clipboard_vision_mcp"]`

## 4. Configure image-paste keybindings ⚠️ important

Opencode does **not** bind image-paste to `Ctrl+V` / `Alt+V` by default. Without this step, copying a screenshot and hitting paste will insert nothing (or plain text).

Edit the `keybinds` section of `opencode.json` (or `keybinds.json` if you use a split config):

```json
{
  "keybinds": {
    "input_paste": "ctrl+v",
    "input_paste_image": "alt+v"
  }
}
```

Restart Opencode.

## 5. Test it

1. Take a screenshot (`Win+Shift+S` / `Cmd+Shift+4` / `Print`).
2. Open Opencode, start a session with a text-only model (DeepSeek, GLM, Qwen).
3. Ask: **"Use analyze_clipboard and tell me what's in my clipboard."**
4. The model should call the MCP tool and describe the image.

## 6. Troubleshooting

- **Tools don't appear in Opencode.** Check Opencode's MCP logs. Most common cause: wrong Python path or missing dependency. Run `python -c "import clipboard_vision_mcp"` to confirm the install.
- **"Clipboard does not contain an image."** Make sure you actually copied an image (screenshot or right-click → Copy image), not a file icon or text.
- **Works once then fails.** Temp files live in `$TMPDIR/clipboard_vision_mcp/`. Safe to delete between sessions.
