#!/usr/bin/env bun
# @karnak19/clipboard-vision-mcp

Ajoute la vision aux modèles texte-only dans OpenCode (**DeepSeek V4**, **GLM 5.1**) — **lis directement l'image dans ton presse-papiers**, sans sauvegarder de fichier à la main.

**Zéro install.** Ajoute 4 lignes à ta config OpenCode, copie une capture, et c'est parti.

Fork de [Capetlevrai/clipboard-vision-mcp](https://github.com/Capetlevrai/clipboard-vision-mcp) (lui-même fork de [itcomgroup/vision-mcp-server](https://github.com/itcomgroup/vision-mcp-server)) — réécrit en **TypeScript + Bun**.

---

## Démarrage rapide

### 1. Récupère une clé Groq gratuite

https://console.groq.com/keys (inscription 30 secondes, gratuit)

### 2. Ajoute à ta config OpenCode

`~/.config/opencode/opencode.json` (Linux/macOS) ou `%APPDATA%\opencode\opencode.json` (Windows) :

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "clipboard-vision": {
      "type": "local",
      "command": ["bunx", "@karnak19/clipboard-vision-mcp"],
      "environment": {
        "GROQ_API_KEY": "gsk_ta_cle_ici"
      }
    }
  }
}
```

C'est tout. Redémarre OpenCode.

> **Nécessite [Bun](https://bun.sh)** (`bunx` est l'équivalent `npx` de Bun). Installe avec `curl -fsSL https://bun.sh/install | bash`.

### 3. (Optionnel) Raccourci collage image OpenCode

Opencode ne lie pas le collage d'image par défaut. Ajoute ça à ta config :

```json
{
  "keybinds": {
    "input_paste": "ctrl+v",
    "input_paste_image": "alt+v"
  }
}
```

---

## Comment ça marche

Quand ton modèle texte-only (DeepSeek, GLM, Qwen, ...) a besoin de voir une image :

1. Tu colles une capture (`Alt+V` dans OpenCode)
2. Le modèle appelle `analyze_clipboard`
3. Ce serveur MCP lit ton presse-papiers, envoie l'image à **Groq + Llama-4 Scout** (gratuit)
4. Groq renvoie une description texte que le modèle peut exploiter

```
copier → demander → terminé. Aucun fichier à manipuler.
```

---

## Outils

### Outils clipboard (pas de fichier nécessaire)

| Outil | Entrée | Quand l'utiliser |
|---|---|---|
| `analyze_clipboard` | `prompt` optionnel | Description générique, questions sur l'image |
| `extract_text_from_clipboard` | — | OCR pur |
| `describe_ui_from_clipboard` | — | Revue UI/UX, inventaire de composants |
| `diagnose_error_from_clipboard` | — | Capture d'erreur → cause + correctif |
| `code_from_clipboard` | — | Extraire du code d'une capture |

### Outils fichier (image déjà sur disque)

| Outil | Entrée | Quand l'utiliser |
|---|---|---|
| `analyze_image` | `image_path`, `prompt` optionnel | Analyse générique d'un fichier |
| `extract_text` | `image_path` | OCR d'un fichier |
| `describe_ui` | `image_path` | Décrire une capture UI |
| `diagnose_error` | `image_path` | Diagnostiquer une erreur |
| `understand_diagram` | `image_path` | Interpréter un diagramme |
| `analyze_chart` | `image_path` | Analyser un graphique |
| `code_from_screenshot` | `image_path` | Extraire du code d'une capture |

---

## Autres clients MCP

**Claude Code** (`~/.claude/settings.json`) :

```json
{
  "mcpServers": {
    "clipboard-vision": {
      "command": "bunx",
      "args": ["@karnak19/clipboard-vision-mcp"],
      "env": {
        "GROQ_API_KEY": "gsk_ta_cle_ici"
      }
    }
  }
}
```

---

## Prérequis clipboard par OS

| OS | Installation ? | Notes |
|---|---|---|
| **Windows** | Non | PowerShell gère tout nativement |
| **macOS** | `brew install pngpaste` *(optionnel)* | osascript suffit la plupart du temps |
| **Linux — Wayland** | `sudo apt install wl-clipboard` | Fournit `wl-paste` |
| **Linux — X11** | `sudo apt install xclip` | Ou équivalent pour ta distro |

---

## Optionnel : changer le modèle de vision

```bash
GROQ_API_KEY=gsk_xxx VISION_MODEL=meta-llama/llama-4-maverick-17b-128e-instruct bunx @karnak19/clipboard-vision-mcp
```

Par défaut : `meta-llama/llama-4-scout-17b-16e-instruct`

---

## Sécurité

- **Stdio local uniquement** — aucun port réseau, ne parle qu'au client MCP + Groq HTTPS
- **Allow-list d'extensions** — uniquement `.png .jpg .jpeg .gif .webp .bmp`
- **Validation magic-bytes** — contenu vérifié contre les en-têtes image avant upload
- **Limite 20 Mo** par image
- **Suppression automatique** des fichiers clipboard temporaires après analyse
- **Aucune télémétrie** — zero analytics, zero phone-home

---

## Dépannage

- **« Clipboard does not contain an image. »** — Copie une vraie image, pas un icône de fichier
- **« GROQ_API_KEY is not set. »** — Vérifie le bloc `environment` dans ta config, redémarre le client
- **Les outils n'apparaissent pas** — Lance `GROQ_API_KEY=test bunx @karnak19/clipboard-vision-mcp` à la main ; ça doit démarrer silencieusement sur stdin
- **« Refusing to read '.env' »** — Le garde-fou sécurité fait son boulot ; seuls les fichiers image sont acceptés

---

## Crédits

- Fork de [Capetlevrai/clipboard-vision-mcp](https://github.com/Capetlevrai/clipboard-vision-mcp) (version Python)
- Original : [itcomgroup/vision-mcp-server](https://github.com/itcomgroup/vision-mcp-server)
- Modèle de vision : [Llama-4 Scout](https://groq.com/) servi par Groq

## Licence

MIT
