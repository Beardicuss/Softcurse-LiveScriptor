# Workspace

## Overview

pnpm workspace monorepo using TypeScript. This project is Softcurse LiveScriptor — a full-featured web IDE with cyberpunk UI.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite, Monaco Editor, Zustand, react-resizable-panels, framer-motion
- **AI**: OpenAI via Replit AI Integrations (gpt-5.2)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server (projects, files, terminal, AI)
│   └── livescriptor/       # React+Vite IDE frontend
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
│       └── src/schema/
│           └── projects.ts # Projects table schema
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## IDE Features

- **Monaco Editor** — full-featured code editor with syntax highlighting, cyberpunk theme
- **File Explorer** — tree view with colored file-type icons, create/rename/delete (right-click context menu), new file/folder buttons
- **Live Preview** — iframe with correct HTML/CSS/JS inline injection, desktop/tablet/mobile device frame toggles
- **Terminal** — execute shell commands, command history (↑/↓), clear button
- **AI Assistant** — GPT-powered chat panel for coding help
- **Search Panel** — global regex/case-sensitive search across project files with file grouping
- **HTTP Client** — Postman-like request builder with headers, body, response viewer
- **Command Palette** — Ctrl+P quick file open with fuzzy search
- **Activity Sidebar** — VSCode-style left icon bar to switch between Explorer / Search / HTTP Client
- **Settings Panel** — font size, tab size, word wrap, minimap, auto-save, themes (persisted to localStorage)
- **Auto-save** — debounced 1.5s auto-save when enabled in settings
- **ZIP Download** — download entire project as .zip via download button in toolbar
- **Multiple project types**: Vanilla HTML/CSS/JS, React (Vite), Node.js (selectable at project creation)

## Key Environment Variables

- `DATABASE_URL` — PostgreSQL connection string (auto-set by Replit)
- `AI_INTEGRATIONS_OPENAI_BASE_URL` — OpenAI proxy URL (auto-set by Replit AI Integrations)
- `AI_INTEGRATIONS_OPENAI_API_KEY` — OpenAI proxy key (auto-set by Replit AI Integrations)
- `PROJECTS_ROOT` — Directory where user project files are stored (defaults to `./user-projects` in CWD)

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes:
- `GET/POST /api/projects` — list/create projects
- `GET/DELETE /api/projects/:id` — get/delete project
- `GET/POST /api/projects/:id/files` — list/create files
- `GET /api/projects/:id/files/content?path=` — get file content
- `PUT /api/projects/:id/files/content` — save file
- `POST /api/projects/:id/files/delete` — delete file
- `POST /api/projects/:id/files/rename` — rename file
- `POST /api/projects/:id/terminal` — execute shell command
- `POST /api/projects/:id/search` — search files (regex, case-sensitive, file pattern)
- `GET /api/projects/:id/download` — download project as ZIP
- `POST /api/ai/chat` — AI assistant chat

### `artifacts/livescriptor` (`@workspace/livescriptor`)

React + Vite cyberpunk IDE frontend.
- Welcome screen at `/`
- IDE at `/project/:id`
- Cyberpunk theme: deep black bg, cyan/magenta neon accents
- Monaco Editor, resizable panels, file tree, terminal, AI panel

### `lib/db` (`@workspace/db`)

- `projects` table: id (uuid), name, description, type, createdAt, updatedAt
