import { Router, type IRouter } from "express";
import { db, projectsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const router: IRouter = Router();

const PROJECTS_ROOT = process.env.PROJECTS_ROOT || path.join(process.cwd(), "user-projects");

function getProjectDir(projectId: string): string {
  return path.join(PROJECTS_ROOT, projectId);
}

/** Resolve the actual directory for a project, checking the DB for a custom location */
async function resolveProjectDir(projectId: string): Promise<string> {
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
  if (project?.location) {
    return project.location;
  }
  return path.join(PROJECTS_ROOT, projectId);
}

function ensureProjectsRoot() {
  if (!fs.existsSync(PROJECTS_ROOT)) {
    fs.mkdirSync(PROJECTS_ROOT, { recursive: true });
  }
}

const STARTER_TEMPLATES: Record<string, Record<string, string>> = {
  vanilla: {
    "index.html": `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Project</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="container">
    <h1>Hello, World!</h1>
    <p>Edit the files on the left to get started.</p>
    <button id="btn">Click me</button>
    <p id="output"></p>
  </div>
  <script src="script.js"></script>
</body>
</html>`,
    "style.css": `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Space Mono', monospace;
  background: #020202;
  color: #e0e0e0;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.container {
  text-align: center;
  padding: 2rem;
}

h1 {
  font-size: 3rem;
  color: #00ffff;
  text-shadow: 0 0 20px #00ffff;
  margin-bottom: 1rem;
}

p {
  color: #888;
  margin-bottom: 2rem;
}

button {
  background: transparent;
  border: 1px solid #00ffff;
  color: #00ffff;
  padding: 0.75rem 2rem;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s;
}

button:hover {
  background: #00ffff;
  color: #020202;
  box-shadow: 0 0 20px #00ffff;
}

#output {
  margin-top: 1rem;
  color: #00ffc8;
}`,
    "script.js": `const btn = document.getElementById('btn');
const output = document.getElementById('output');
let count = 0;

btn.addEventListener('click', () => {
  count++;
  output.textContent = \`You clicked \${count} time\${count !== 1 ? 's' : ''}!\`;
});

console.log('LiveScriptor IDE - JavaScript loaded!');`,
  },
  react: {
    "index.html": `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>React App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`,
    "src/main.jsx": `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
    "src/App.jsx": `import { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div style={{ textAlign: 'center', padding: '2rem', background: '#020202', minHeight: '100vh', color: '#e0e0e0', fontFamily: 'monospace' }}>
      <h1 style={{ color: '#00ffff', textShadow: '0 0 20px #00ffff', marginBottom: '1rem' }}>
        React App
      </h1>
      <p style={{ color: '#888', marginBottom: '2rem' }}>Built with LiveScriptor IDE</p>
      <button
        onClick={() => setCount(c => c + 1)}
        style={{
          background: 'transparent', border: '1px solid #00ffff', color: '#00ffff',
          padding: '0.75rem 2rem', fontSize: '1rem', cursor: 'pointer'
        }}
      >
        Count: {count}
      </button>
    </div>
  );
}

export default App;`,
    "package.json": `{
  "name": "react-app",
  "version": "0.0.1",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.0.0"
  }
}`,
  },
  node: {
    "index.js": `const http = require('http');

const server = http.createServer((req, res) => {
  if (req.url === '/' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Hello from Node.js!', timestamp: new Date().toISOString() }));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(\`Server running at http://localhost:\${PORT}\`);
});`,
    "package.json": `{
  "name": "node-app",
  "version": "0.0.1",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "node --watch index.js"
  }
}`,
    "README.md": `# Node.js App

A simple Node.js server created with LiveScriptor IDE.

## Running

\`\`\`bash
npm start
\`\`\`
`,
  },
  typescript: {
    "src/index.ts": `console.log("Hello from TypeScript!");

interface AppConfig {
  name: string;
  port: number;
  debug: boolean;
}

const config: AppConfig = {
  name: "LiveScriptor TS App",
  port: 3000,
  debug: true,
};

function start(config: AppConfig): void {
  console.log(\`Starting \${config.name} on port \${config.port}\`);
  if (config.debug) console.log("Debug mode enabled");
}

start(config);
`,
    "tsconfig.json": `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}`,
    "package.json": `{
  "name": "ts-app",
  "version": "1.0.0",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsc --watch"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}`,
  },
  python: {
    "main.py": `"""LiveScriptor Python Project"""

def greet(name: str) -> str:
    return f"Hello, {name}! Welcome to LiveScriptor."

def fibonacci(n: int) -> list[int]:
    """Generate first n Fibonacci numbers."""
    fib = [0, 1]
    for i in range(2, n):
        fib.append(fib[i-1] + fib[i-2])
    return fib[:n]

if __name__ == "__main__":
    print(greet("Developer"))
    print(f"First 10 Fibonacci numbers: {fibonacci(10)}")
`,
    "requirements.txt": `# Add your dependencies here
# requests>=2.28.0
# flask>=2.3.0
`,
    "README.md": `# Python Project

Created with LiveScriptor IDE.

## Running

\\\`\\\`\\\`bash
python main.py
\\\`\\\`\\\`
`,
  },
  nextjs: {
    "pages/index.jsx": `export default function Home() {
  return (
    <div style={{ textAlign: 'center', padding: '4rem', fontFamily: 'monospace', background: '#020202', minHeight: '100vh', color: '#e0e0e0' }}>
      <h1 style={{ color: '#00ffff', fontSize: '3rem' }}>Next.js App</h1>
      <p style={{ color: '#888' }}>Created with LiveScriptor IDE</p>
      <p style={{ marginTop: '2rem' }}>Edit <code>pages/index.jsx</code> to get started.</p>
    </div>
  );
}
`,
    "package.json": `{
  "name": "nextjs-app",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  }
}`,
  },
  vue: {
    "index.html": `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vue App</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>`,
    "src/main.js": `import { createApp } from 'vue';
import App from './App.vue';

createApp(App).mount('#app');
`,
    "src/App.vue": `<template>
  <div class="app">
    <h1>{{ title }}</h1>
    <p>Count: {{ count }}</p>
    <button @click="count++">Increment</button>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const title = ref('Vue + LiveScriptor');
const count = ref(0);
</script>

<style scoped>
.app {
  text-align: center;
  padding: 2rem;
  font-family: monospace;
  background: #020202;
  min-height: 100vh;
  color: #e0e0e0;
}
h1 { color: #42b883; }
button {
  padding: 0.5rem 1.5rem;
  border: 1px solid #42b883;
  background: transparent;
  color: #42b883;
  cursor: pointer;
  font-family: monospace;
}
button:hover {
  background: #42b883;
  color: #020202;
}
</style>
`,
    "package.json": `{
  "name": "vue-app",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "vue": "^3.4.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "@vitejs/plugin-vue": "^5.0.0"
  }
}`,
  },
  game: {
    "index.html": `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HTML5 Game</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <canvas id="game" width="800" height="600"></canvas>
  <script src="game.js"></script>
</body>
</html>`,
    "style.css": `* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  background: #0a0a0a;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}
canvas {
  border: 2px solid #00ffff;
  box-shadow: 0 0 30px rgba(0,255,255,0.3);
}`,
    "game.js": `const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// Game state
let player = { x: 400, y: 500, w: 40, h: 40, speed: 5, color: '#00ffff' };
let stars = [];
let score = 0;
let keys = {};

// Generate stars
for (let i = 0; i < 50; i++) {
  stars.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: Math.random() * 2 + 1,
    speed: Math.random() * 2 + 0.5,
  });
}

// Input
document.addEventListener('keydown', e => keys[e.key] = true);
document.addEventListener('keyup', e => keys[e.key] = false);

function update() {
  if (keys['ArrowLeft'] || keys['a'])  player.x -= player.speed;
  if (keys['ArrowRight'] || keys['d']) player.x += player.speed;
  if (keys['ArrowUp'] || keys['w'])    player.y -= player.speed;
  if (keys['ArrowDown'] || keys['s'])  player.y += player.speed;

  player.x = Math.max(0, Math.min(canvas.width - player.w, player.x));
  player.y = Math.max(0, Math.min(canvas.height - player.h, player.y));

  stars.forEach(s => {
    s.y += s.speed;
    if (s.y > canvas.height) {
      s.y = -5;
      s.x = Math.random() * canvas.width;
      score++;
    }
  });
}

function draw() {
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Stars
  ctx.fillStyle = '#ffffff';
  stars.forEach(s => {
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();
  });

  // Player
  ctx.fillStyle = player.color;
  ctx.shadowColor = player.color;
  ctx.shadowBlur = 15;
  ctx.fillRect(player.x, player.y, player.w, player.h);
  ctx.shadowBlur = 0;

  // Score
  ctx.fillStyle = '#00ffff';
  ctx.font = '16px monospace';
  ctx.fillText('Score: ' + score, 10, 25);
  ctx.fillText('WASD / Arrow keys to move', 10, canvas.height - 15);
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();
console.log('Game started! Use WASD or Arrow keys.');
`,
  },
};

router.get("/projects", async (req, res): Promise<void> => {
  const projects = await db.select().from(projectsTable).orderBy(projectsTable.createdAt);
  res.json(projects);
});

router.post("/projects", async (req, res): Promise<void> => {
  const { name, description, type = "vanilla", location } = req.body;

  if (!name || typeof name !== "string") {
    res.status(400).json({ error: "bad_request", message: "name is required" });
    return;
  }

  // Determine the project directory
  let projectDir: string;
  let storedLocation: string | null = null;

  if (location && typeof location === "string" && location.trim()) {
    // User chose a custom location — project lives at <location>/<name>
    projectDir = path.resolve(location.trim(), name.replace(/[^a-zA-Z0-9_\-. ]/g, "_"));
    storedLocation = projectDir;
  } else {
    // Default: user-projects/<id> (we'll set the path after DB insert)
    projectDir = "";
  }

  const [project] = await db
    .insert(projectsTable)
    .values({ name, description, type, location: storedLocation })
    .returning();

  if (!projectDir) {
    ensureProjectsRoot();
    projectDir = getProjectDir(project.id);
  }

  // If location was custom, update the DB with the final resolved path
  if (storedLocation) {
    await db.update(projectsTable).set({ location: projectDir }).where(eq(projectsTable.id, project.id));
  }

  fs.mkdirSync(projectDir, { recursive: true });

  const templates = STARTER_TEMPLATES[type] || STARTER_TEMPLATES.vanilla;
  for (const [filePath, content] of Object.entries(templates)) {
    const fullPath = path.join(projectDir, filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, "utf-8");
  }

  res.status(201).json(project);
});

/** Returns the default projects root so the frontend can show it */
router.get("/projects/default-location", async (_req, res): Promise<void> => {
  res.json({ path: PROJECTS_ROOT });
});

router.post("/projects/import", async (req, res): Promise<void> => {
  const { url, name, description } = req.body;

  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "bad_request", message: "Git URL is required" });
    return;
  }

  const projectName = name || url.split('/').pop()?.replace('.git', '') || "imported-project";

  const [project] = await db
    .insert(projectsTable)
    .values({ name: projectName, description: description || "Imported from Git", type: "vanilla" })
    .returning();

  ensureProjectsRoot();
  const projectDir = getProjectDir(project.id);

  try {
    if (fs.existsSync(url)) {
      const stat = fs.statSync(url);
      if (stat.isDirectory()) {
        fs.cpSync(url, projectDir, { recursive: true });
      } else if (url.toLowerCase().endsWith(".zip")) {
        fs.mkdirSync(projectDir, { recursive: true });
        const isWindows = process.platform === "win32";
        if (isWindows) {
          await execAsync(`tar.exe -xf "${url}" -C "${projectDir}"`);
        } else {
          await execAsync(`unzip "${url}" -d "${projectDir}"`);
        }
      } else {
        throw new Error("Local path must be a directory or a .zip file");
      }
    } else if (url.startsWith("http") || url.startsWith("git@") || url.startsWith("github")) {
      await execAsync(`git clone "${url}" "${projectDir}"`);
    } else {
      throw new Error("Invalid source: must be a Git URL or an existing local path");
    }

    res.status(201).json(project);
  } catch (error: any) {
    // Cleanup DB and folder if git clone fails
    await db.delete(projectsTable).where(eq(projectsTable.id, project.id));
    if (fs.existsSync(projectDir)) {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
    console.error("Git clone failed:", error);
    res.status(500).json({ error: "git_clone_failed", message: error.message });
  }
});

/**
 * Opens a native OS folder-picker dialog and returns the chosen path.
 * Must be registered BEFORE /projects/:projectId to avoid Express treating
 * "browse-folder" as a project ID.
 */
router.get("/projects/browse-folder", async (_req, res): Promise<void> => {
  const platform = process.platform;

  try {
    let chosenPath: string | null = null;

    if (platform === "win32") {
      // PowerShell WinForms folder browser
      const ps = [
        "Add-Type -AssemblyName System.Windows.Forms;",
        "$d = New-Object System.Windows.Forms.FolderBrowserDialog;",
        "$d.Description = 'Select project location';",
        "$d.ShowNewFolderButton = $true;",
        "if ($d.ShowDialog() -eq 'OK') { Write-Output $d.SelectedPath }",
      ].join(" ");
      const { stdout } = await execAsync(`powershell -NoProfile -Command "${ps}"`);
      const trimmed = stdout.trim();
      if (trimmed) chosenPath = trimmed;

    } else if (platform === "darwin") {
      // macOS: osascript choose folder
      const { stdout } = await execAsync(
        `osascript -e 'POSIX path of (choose folder with prompt "Select project location")'`
      );
      const trimmed = stdout.trim().replace(/\/$/, ""); // strip trailing slash
      if (trimmed) chosenPath = trimmed;

    } else {
      // Linux: try zenity, fall back to kdialog
      try {
        const { stdout } = await execAsync(
          "zenity --file-selection --directory --title='Select project location'"
        );
        const trimmed = stdout.trim();
        if (trimmed) chosenPath = trimmed;
      } catch {
        const { stdout } = await execAsync(
          "kdialog --getexistingdirectory $HOME"
        );
        const trimmed = stdout.trim();
        if (trimmed) chosenPath = trimmed;
      }
    }

    if (chosenPath) {
      res.json({ path: chosenPath, cancelled: false });
    } else {
      res.json({ path: null, cancelled: true });
    }
  } catch (err: any) {
    // Exit code 1 = user cancelled the dialog — not a real error
    if (err.code === 1) {
      res.json({ path: null, cancelled: true });
    } else {
      console.error("browse-folder error:", err);
      res.status(500).json({ error: "dialog_failed", message: err.message });
    }
  }
});

router.get("/projects/:projectId", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
  if (!project) {
    res.status(404).json({ error: "not_found", message: "Project not found" });
    return;
  }
  res.json(project);
});

router.delete("/projects/:projectId", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;
  const [project] = await db.delete(projectsTable).where(eq(projectsTable.id, id)).returning();
  if (!project) {
    res.status(404).json({ error: "not_found", message: "Project not found" });
    return;
  }

  // Only remove from LiveScriptor's database — files on disk are NOT touched
  res.json({ success: true, message: "Project removed from LiveScriptor" });
});

export default router;
