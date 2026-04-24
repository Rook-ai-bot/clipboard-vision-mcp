# clipboard-vision-mcp

> 🇬🇧 **[Version anglaise → README.md](README.md)**

> Ajoute la vision aux modèles texte-only dans Opencode (**DeepSeek V4**, **GLM 5.1**) — **lis directement l'image dans ton presse-papiers**, sans sauvegarder de fichier à la main.

**Testé sur Windows 11 + Opencode + DeepSeek V4 Pro.** Support clipboard multi-OS (Windows / macOS / Linux X11 / Linux Wayland).

Forké depuis [itcomgroup/vision-mcp-server](https://github.com/itcomgroup/vision-mcp-server) — réécrit autour d'outils clipboard-first, durcissement sécurité, extraction clipboard cross-platform, et maintenant propulsé par **TypeScript + Bun**.

---

## Le problème

Les modèles texte-only rapides et peu coûteux comme **DeepSeek V4** et **GLM 5.1** sont excellents pour le code mais ne savent pas lire d'images. À chaque capture d'écran collée, le modèle te demande de la sauvegarder sur disque et de lui donner le chemin.

## La solution

Ce serveur MCP expose des outils `*_from_clipboard`. Quand le LLM veut voir ta capture, il appelle `analyze_clipboard` — le serveur lit l'image du presse-papiers, l'envoie à un vrai modèle de vision (**Groq + Llama-4 Scout, gratuit**), et renvoie une description texte que le modèle peut exploiter.

Résultat : **copier → demander → terminé.** Aucun fichier à manipuler.

---

## Fonctionnalités

- 🖼️ **Clipboard-first** — `analyze_clipboard`, `extract_text_from_clipboard`, `diagnose_error_from_clipboard`, `describe_ui_from_clipboard`, `code_from_clipboard`.
- 📁 **Fallback fichier** — mêmes outils disponibles pour les images déjà sur disque.
- 🆓 **Vision gratuite** — Groq free tier avec Llama-4 Scout (17B, multimodal).
- 🖥️ **Multi-OS** — Windows, macOS, Linux (X11 + Wayland).
- 🔒 **Sécurisé** — validation extension/taille/magic-bytes, suppression auto des fichiers clipboard temporaires.
- 🔌 **Standard MCP** — fonctionne avec Opencode, Claude Code, Cursor, Cline, Continue, ou tout client MCP.
- ⚡ **TypeScript + Bun** — démarrage rapide, pas besoin de Python.

---

## Prérequis

- **Bun** >= 1.0.0 (https://bun.sh)
- **Clé API Groq** (gratuite, 30 secondes) : https://console.groq.com/keys
- Un client MCP (Opencode, Claude Code, Cursor, Cline, Continue, ...)

### Dépendances (installées automatiquement via `bun install`)

| Paquet | Rôle |
|---|---|
| `@modelcontextprotocol/sdk` | Serveur de protocole MCP |
| `groq-sdk` | Client API Groq (vision Llama-4 Scout) |

### Dépendances clipboard par OS

| OS | Commande | Pourquoi |
|---|---|---|
| **Windows** | *rien à installer* | PowerShell gère le clipboard nativement. |
| **macOS** | `brew install pngpaste` *(fallback optionnel)* | osascript suffit la plupart du temps. |
| **Linux — Wayland** | `sudo apt install wl-clipboard` | Fournit `wl-paste`. |
| **Linux — X11** | `sudo apt install xclip` | Ou équivalent pour ta distro. |

---

## Démarrage rapide

### 1. Récupère une clé Groq gratuite
https://console.groq.com/keys

### 2. Installation

```bash
git clone https://github.com/Rook-ai-bot/clipboard-vision-mcp.git
cd clipboard-vision-mcp
bun install
```

### 3. Teste que le serveur démarre

```bash
GROQ_API_KEY=gsk_ta_cle_ici bun run src/index.ts
```

Il devrait démarrer et attendre silencieusement sur stdin. Ctrl+C pour arrêter.

### 4. Branche-le à ton client MCP

**Opencode** (`%APPDATA%\opencode\opencode.json` sous Windows, `~/.config/opencode/opencode.json` sous Linux/macOS) :

```json
{
  "mcp": {
    "clipboard-vision": {
      "type": "local",
      "command": ["bun", "run", "/chemin/absolu/vers/clipboard-vision-mcp/src/index.ts"],
      "enabled": true,
      "environment": {
        "GROQ_API_KEY": "gsk_ta_cle_ici"
      }
    }
  }
}
```

**Claude Code** (`~/.claude/settings.json`) :

```json
{
  "mcpServers": {
    "clipboard-vision": {
      "command": "bun",
      "args": ["run", "/chemin/absolu/vers/clipboard-vision-mcp/src/index.ts"],
      "env": {
        "GROQ_API_KEY": "gsk_ta_cle_ici"
      }
    }
  }
}
```

> 💡 **Utilise le chemin absolu vers le projet.** Ça garantit que le MCP démarre correctement, peu importe le shell ou le cwd.

### 5. ⚠️ Raccourcis Opencode pour coller des images

Opencode **ne** lie **pas** le collage d'image à `Ctrl+V` / `Alt+V` par défaut. Sans cette étape, coller une capture insère du texte (ou rien).

Édite `keybinds.json` ou la section `keybinds` d'`opencode.json` :

```json
{
  "keybinds": {
    "input_paste": "ctrl+v",
    "input_paste_image": "alt+v"
  }
}
```

Redémarre Opencode.

---

## Utilisation

```
Toi : (copie une capture, puis tape)
      "Regarde ce que je viens de copier et dis-moi quelle est cette erreur."

LLM (DeepSeek, GLM, Claude, ...): [appelle diagnose_error_from_clipboard]
      → "L'erreur dit `ECONNREFUSED 127.0.0.1:5432`. Postgres n'écoute
         pas sur le port 5432. Démarre-le avec : ..."
```

Le modèle texte-only ne voit jamais les pixels — il lit la description renvoyée par Llama-4 Scout et raisonne dessus.

### Référence des outils

| Outil | Entrée | Quand l'utiliser |
|---|---|---|
| `analyze_clipboard` | `prompt` optionnel | Description générique, questions sur l'image. |
| `extract_text_from_clipboard` | — | OCR pur. |
| `describe_ui_from_clipboard` | — | Revue UI/UX, inventaire de composants. |
| `diagnose_error_from_clipboard` | — | Capture d'erreur → cause + correctif. |
| `code_from_clipboard` | — | Extraire du code d'une capture. |
| `analyze_image` | `image_path`, `prompt` optionnel | Image déjà sur disque. |
| `extract_text`, `describe_ui`, `diagnose_error`, `understand_diagram`, `analyze_chart`, `code_from_screenshot` | `image_path` | Versions fichier des outils ci-dessus. |

---

## Sécurité

Le serveur tourne en **processus local stdio** — aucun port réseau ouvert, il ne parle qu'au client MCP (via stdin/stdout) et à l'API Groq (via HTTPS).

Protections en place :

- **Allow-list d'extensions.** `analyze_image` et les autres outils fichier n'acceptent que `.png .jpg .jpeg .gif .webp .bmp`. Ça empêche un LLM prompt-injecté de demander au serveur de lire un fichier quelconque (`~/.ssh/id_rsa`, `.env`, ...) et de l'exfiltrer en base64 vers Groq.
- **Vérification magic-bytes.** Le contenu du fichier est validé contre des en-têtes d'image connus avant upload.
- **Limite de taille.** 20 Mo max par image.
- **Suppression automatique des fichiers clipboard temporaires** après chaque analyse. Les captures peuvent contenir des secrets (tokens, chats, identifiants) — le serveur les écrit dans `$TMPDIR/clipboard_vision_mcp/` puis les supprime une fois l'analyse terminée.
- **Aucune télémétrie.**

### Ce que le projet ne peut PAS te garantir

- **Ta clé API vit en clair dans ta config client MCP.** C'est comme ça que les clients MCP fonctionnent aujourd'hui. Garde ce fichier non-lisible par les autres et ne le commite jamais. Si tu exposes une clé par accident (chat, capture, git push), **rotate-la** sur https://console.groq.com/keys.
- **Groq reçoit les images analysées.** Consulte leur [politique de confidentialité](https://groq.com/privacy-policy/) avant d'envoyer du sensible.
- **Tout outil MCP est exécuté à la demande du LLM.** Si tu connectes un modèle prompt-injecté à ce serveur et lui fais lire de l'input non fiable, le modèle choisit ce qu'il analyse. L'allow-list ci-dessus limite les dégâts mais ne peut pas les éliminer.

### Signaler une faille

Ouvre un [security advisory privé](https://github.com/Capetlevrai/clipboard-vision-mcp/security/advisories/new) plutôt qu'une issue publique.

---

## Fonctionnement

```
┌──────────────┐   MCP   ┌─────────────────┐   HTTPS   ┌─────────────────┐
│  Opencode    │ ──────▶ │  clipboard-     │ ────────▶ │  Groq API       │
│  (DeepSeek)  │         │  vision-mcp     │           │  Llama-4 Scout  │
└──────────────┘         └─────────────────┘           └─────────────────┘
                              │
                              ▼
                    lit le presse-papiers système
                    (PowerShell / osascript / wl-paste / xclip)
                    → valide → base64 → envoie → supprime
```

---

## Dépannage

- **« Clipboard does not contain an image. »** — Copie une vraie image, pas un icône de fichier ou du texte. Sous Linux, teste `wl-paste --type image/png` ou `xclip -selection clipboard -t image/png -o | file -` hors du MCP.
- **« GROQ_API_KEY is not set. »** — Vérifie le bloc `environment` dans la config client, puis **redémarre complètement** le client.
- **Les outils n'apparaissent pas dans Opencode.** — Regarde les logs MCP d'Opencode. Lance `bun run src/index.ts` à la main — il doit démarrer et rester silencieux sur stdin.
- **« Refusing to read '<ext>' — only image files are allowed. »** — Tu (ou le LLM) a passé un chemin non-image. C'est le garde-fou sécurité qui fait son boulot.

---

## Crédits

- Forké depuis [itcomgroup/vision-mcp-server](https://github.com/itcomgroup/vision-mcp-server) — intégration Groq + Llama-4 Scout originale.
- Modèle de vision : [Llama-4 Scout 17B](https://groq.com/) servi par Groq.

## Licence

MIT — voir [LICENSE](LICENSE).
