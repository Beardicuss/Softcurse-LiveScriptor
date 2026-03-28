<div align="center">
  <img src="assets/script_1774471493283.png" alt="LiveScriptor Logo" width="128" />
  
  # Softcurse LiveScriptor
  
  **An advanced, self-hosted Cyberpunk Web-IDE packaged into a high-performance Windows Desktop Application.**

  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Electron](https://img.shields.io/badge/Electron-33.4.11-47848f?logo=electron)](https://www.electronjs.org/)
  [![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20.0-43853D?logo=node.js)](https://nodejs.org/)
  [![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
  [![SQLite](https://img.shields.io/badge/SQLite-Drizzle_ORM-003B57?logo=sqlite)](https://sqlite.org/)
  [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
</div>

---

## 📖 Table of Contents
- [Overview](#-overview)
- [✨ Features](#-features)
- [📦 Installation](#-installation)
- [🚀 Quick Start](#-quick-start)
- [🔧 Configuration (AI Integrations)](#-configuration)
- [🏗️ Architecture](#-architecture)
- [🤝 Contributing](#-contributing)
- [🛣️ Roadmap](#-roadmap)
- [📄 License](#-license)
- [💬 Support](#-support)

---

## 🔭 Overview

**LiveScriptor** bridges the gap between cloud-based Web IDEs and heavy traditional desktop editors. Originally conceived as a web-hosted development environment, it has been aggressively re-architected into a standalone **Windows Desktop Application** using Electron. 

It provides an isolated, high-speed, local development environment powered by a monolithic Express API server, an embedded SQLite database, and a highly responsive React/Monaco frontend. Built for developers who demand complete local control over their toolchain while retaining the advanced capabilities of native AI pair-programming.

---

## ✨ Features

- 🖥️ **Native Desktop Experience** — Packaged via Electron for seamless Windows 10/11 integration.
- ⚡ **Zero-Latency File System** — Direct mounting of your local machine's directories for instantaneous reads/writes.
- 🧠 **Bring Your Own AI (BYOK)** — Natively integrated Chat Interface. Plug in your own API keys for OpenAI (GPT-4), Google (Gemini), xAI (Grok), or OpenRouter.
- 🗄️ **Embedded SQLite Storage** — All settings, AI chat histories, and project metadata are securely stored fully offline using `better-sqlite3` and `drizzle-orm`.
- 🎨 **Cyberpunk Aesthetic** — A meticulously crafted, hardware-accelerated dark mode UI powered by TailwindCSS and Radix UI.
- 📝 **Monaco Editor Engine** — World-class syntax highlighting, code folding, and auto-completion.
- 🚀 **Self-Contained Executable** — The entire API server, React frontend, and native dependencies are squashed into a single, highly-optimized ASAR archive.

---

## 📦 Installation

There are two ways to run LiveScriptor:

### Method 1: Download the Installer (Recommended)
1. Go to the [GitHub Releases](https://github.com/Beardicuss/Softcurse-LiveScriptor/releases) page.
2. Download `Softcurse LiveScriptor-1.0.0-Setup.exe`.
3. Run the installer. It will automatically install the application and place a shortcut on your desktop.

### Method 2: Build from Source
If you wish to compile the latest bleeding-edge version yourself:

**Prerequisites:**
- Node.js v20+
- `pnpm` v9+
- Windows 10/11 (for the `.exe` compilation)

```bash
# 1. Clone the repository
git clone https://github.com/Beardicuss/Softcurse-LiveScriptor.git
cd Softcurse-LiveScriptor

# 2. Install dependencies across the monorepo
pnpm install

# 3. Build all internal packages & the frontend
pnpm run build

# 4. Compile the Electron App into a Windows Installer
pnpm run electron:build
```
> The compiled `.exe` installer will be output to the `release/` directory.

---

## 🚀 Quick Start

1. **Launch the App:** Open "Softcurse LiveScriptor" from your Start Menu.
2. **Mount a Workspace:** 
   - On the welcome screen, click **"Open Local Folder"**.
   - Select the directory on your hard drive you wish to edit.
3. **Start Coding:** The internal API server will instantly map the directory to the Monaco Editor. Click any file in the left File Explorer pane to begin editing.

---

## 🔧 Configuration

LiveScriptor's crowning feature is its **local AI assistant**. Because the app is completely offline, you must supply your own API keys.

1. Open LiveScriptor.
2. Click the **Settings (Gear Icon)** in the bottom left corner.
3. Navigate to the **AI Provider** tab.
4. Select your preferred provider (OpenAI, OpenRouter, Gemini, or Grok).
5. Paste your private API Key.
6. *(Optional)* Override the default Base URL or Model tag.
7. Click **Save Settings**. 

The settings are instantly committed to the local encrypted SQLite database (`livescriptor.db`). You can now press `Ctrl + J` (or click the AI Panel) to begin pair programming!

---

## 🏗️ Architecture

The application is structured as a tightly-coupled `pnpm` monorepo:

*   **`artifacts/livescriptor/`** — The Vite/React frontend. Handles the UI, Monaco editor, and state management via Zustand and TanStack Query.
*   **`artifacts/api-server/`** — The monolithic Express.js backend. Serves the REST API, executes physical file system I/O operations, and handles AI network requests.
*   **`electron/`** — The Electron wrapper. Bootstraps the application, mounts the embedded Express server onto an available port, and spins up the Chromium WebView.
*   **`lib/db/`** — The SQLite integration layer using Drizzle ORM.
*   **`lib/api-client-react/`** & **`lib/api-zod/`** — Shared type-safe RPC contracts passing between the frontend and backend.

---

## 🧪 Development & Testing

To run the application in Development Mode (with hot-module reloading for both React and the Express server):

```bash
# Boot the dev environment
pnpm run electron:dev
```
*This command runs `concurrently` to spin up the Vite dev server, watch the Express backend, and launch the Electron UI window.*

---

## 🤝 Contributing

We welcome contributions from the community! Whether you're fixing bugs, adding new IDE features, or optimizing the build pipeline:

1. Read our [Code of Conduct](CODE_OF_CONDUCT.md).
2. Review the [Contributing Guidelines](CONTRIBUTING.md).
3. Check out the [Issue Tracker](https://github.com/Beardicuss/Softcurse-LiveScriptor/issues) for open tasks.
4. Submit a Pull Request using our standard PR template.

---

## 🛣️ Roadmap

- [ ] **Integrated Terminal** — Embedding `xterm.js` to pipe PowerShell instances directly into the IDE.
- [ ] **Git Source Control** — Visual UI for commits, branching, and diffs.
- [ ] **Multi-Window Support** — Allowing tear-away editor tabs.
- [ ] **Cross-OS Compilation** — Testing and releasing `.dmg` (macOS) and `.AppImage` (Linux) builds.

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---

## 💬 Support

- **Bug Reports & Feature Requests:** Open an issue via the [GitHub Issues](https://github.com/Beardicuss/Softcurse-LiveScriptor/issues) tab.
- **Security Vulnerabilities:** Please review our [Security Policy](SECURITY.md) for direct email reporting guidelines.
