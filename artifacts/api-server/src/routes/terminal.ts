import { Router, type IRouter } from "express";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const router: IRouter = Router();
const execAsync = promisify(exec);

const PROJECTS_ROOT = process.env.PROJECTS_ROOT || path.join(process.cwd(), "user-projects");

const ALLOWED_COMMANDS = new Set([
  "ls", "pwd", "echo", "cat", "head", "tail", "grep", "find",
  "node", "npm", "npx", "pnpm", "bun",
  "mkdir", "touch", "cp", "mv", "rm",
  "git", "curl", "wget",
  "python", "python3", "pip", "pip3",
  "wc", "sort", "uniq", "awk", "sed",
  "date", "whoami", "env",
]);

function isCommandAllowed(command: string): boolean {
  const parts = command.trim().split(/\s+/);
  const baseCmd = parts[0];
  return ALLOWED_COMMANDS.has(baseCmd);
}

router.post("/projects/:projectId/terminal", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;
  const { command, cwd } = req.body;

  if (!command || typeof command !== "string") {
    res.status(400).json({ error: "bad_request", message: "command is required" });
    return;
  }

  const projectDir = path.join(PROJECTS_ROOT, id);

  if (!fs.existsSync(projectDir)) {
    res.status(404).json({ error: "not_found", message: "Project directory not found" });
    return;
  }

  let workDir = projectDir;
  if (cwd) {
    const resolvedCwd = path.resolve(projectDir, cwd.replace(/^\//, ""));
    if (resolvedCwd.startsWith(projectDir) && fs.existsSync(resolvedCwd)) {
      workDir = resolvedCwd;
    }
  }

  const startTime = Date.now();

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: workDir,
      timeout: 30000,
      maxBuffer: 1024 * 1024 * 5,
      env: {
        ...process.env,
        PATH: process.env.PATH + ":/usr/local/bin:/usr/bin:/bin",
      },
    });

    const executionTime = Date.now() - startTime;
    res.json({ stdout: stdout || "", stderr: stderr || "", exitCode: 0, executionTime });
  } catch (err: any) {
    const executionTime = Date.now() - startTime;
    res.json({
      stdout: err.stdout || "",
      stderr: err.stderr || err.message || "Command failed",
      exitCode: err.code || 1,
      executionTime,
    });
  }
});

router.post("/projects/:projectId/search", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;
  const { query, caseSensitive = false, useRegex = false, filePattern } = req.body;

  if (!query) {
    res.status(400).json({ error: "bad_request", message: "query is required" });
    return;
  }

  const projectDir = path.join(PROJECTS_ROOT, id);
  if (!fs.existsSync(projectDir)) {
    res.json([]);
    return;
  }

  const results: any[] = [];

  function searchInFile(filePath: string, relPath: string) {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split("\n");

      lines.forEach((line, idx) => {
        let match = false;
        let matchStr = "";

        if (useRegex) {
          try {
            const flags = caseSensitive ? "g" : "gi";
            const re = new RegExp(query, flags);
            const m = line.match(re);
            if (m) { match = true; matchStr = m[0]; }
          } catch {}
        } else {
          const haystack = caseSensitive ? line : line.toLowerCase();
          const needle = caseSensitive ? query : query.toLowerCase();
          const col = haystack.indexOf(needle);
          if (col !== -1) {
            match = true;
            matchStr = line.slice(col, col + query.length);
          }
        }

        if (match) {
          results.push({
            file: relPath,
            line: idx + 1,
            column: line.toLowerCase().indexOf(query.toLowerCase()) + 1,
            content: line.trim(),
            match: matchStr,
          });
        }
      });
    } catch {}
  }

  function walkDir(dirPath: string, relPath: string) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const rel = path.join(relPath, entry.name);

      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === ".git") continue;
        walkDir(fullPath, rel);
      } else if (entry.isFile()) {
        if (filePattern) {
          const pattern = filePattern.replace(/\./g, "\\.").replace(/\*/g, ".*");
          if (!new RegExp(pattern).test(entry.name)) continue;
        }
        const ext = path.extname(entry.name).slice(1).toLowerCase();
        const textExts = ["html", "css", "js", "jsx", "ts", "tsx", "json", "md", "txt", "yaml", "yml", "xml", "sh"];
        if (textExts.includes(ext) || !ext) {
          searchInFile(fullPath, rel);
        }
      }
    }
  }

  walkDir(projectDir, "");
  res.json(results.slice(0, 500));
});

export default router;
