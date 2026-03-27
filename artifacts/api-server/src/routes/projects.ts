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
};

router.get("/projects", async (req, res): Promise<void> => {
  const projects = await db.select().from(projectsTable).orderBy(projectsTable.createdAt);
  res.json(projects);
});

router.post("/projects", async (req, res): Promise<void> => {
  const { name, description, type = "vanilla" } = req.body;

  if (!name || typeof name !== "string") {
    res.status(400).json({ error: "bad_request", message: "name is required" });
    return;
  }

  const [project] = await db
    .insert(projectsTable)
    .values({ name, description, type })
    .returning();

  ensureProjectsRoot();
  const projectDir = getProjectDir(project.id);
  fs.mkdirSync(projectDir, { recursive: true });

  const templates = STARTER_TEMPLATES[type] || STARTER_TEMPLATES.vanilla;
  for (const [filePath, content] of Object.entries(templates)) {
    const fullPath = path.join(projectDir, filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, "utf-8");
  }

  res.status(201).json(project);
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

  const projectDir = getProjectDir(id);
  if (fs.existsSync(projectDir)) {
    fs.rmSync(projectDir, { recursive: true, force: true });
  }

  res.json({ success: true, message: "Project deleted" });
});

export default router;
