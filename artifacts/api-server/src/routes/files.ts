import { Router, type IRouter } from "express";
import path from "path";
import fs from "fs";

const router: IRouter = Router();

const PROJECTS_ROOT = process.env.PROJECTS_ROOT || path.join(process.cwd(), "user-projects");

function getProjectDir(projectId: string): string {
  return path.join(PROJECTS_ROOT, projectId);
}

function getLanguage(filename: string): string {
  const ext = path.extname(filename).toLowerCase().slice(1);
  const map: Record<string, string> = {
    js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript",
    html: "html", css: "css", scss: "scss", sass: "sass", json: "json",
    md: "markdown", py: "python", rb: "ruby", go: "go", rs: "rust",
    java: "java", cpp: "cpp", c: "c", cs: "csharp", php: "php",
    sh: "shell", bash: "shell", yml: "yaml", yaml: "yaml", xml: "xml",
    svg: "xml", txt: "plaintext",
  };
  return map[ext] || "plaintext";
}

function buildFileTree(dirPath: string, basePath: string = "/"): any[] {
  if (!fs.existsSync(dirPath)) return [];

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const nodes: any[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relativePath = path.join(basePath, entry.name);

    if (entry.isDirectory()) {
      nodes.push({
        name: entry.name,
        path: relativePath,
        type: "directory",
        children: buildFileTree(fullPath, relativePath),
      });
    } else {
      const stats = fs.statSync(fullPath);
      nodes.push({
        name: entry.name,
        path: relativePath,
        type: "file",
        size: stats.size,
        extension: path.extname(entry.name).slice(1),
      });
    }
  }

  return nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

function resolveSafePath(projectId: string, filePath: string): string | null {
  const projectDir = getProjectDir(projectId);
  const normalizedPath = path.normalize(filePath).replace(/^\//, "");
  const fullPath = path.join(projectDir, normalizedPath);

  if (!fullPath.startsWith(projectDir)) return null;
  return fullPath;
}

router.get("/projects/:projectId/files", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;
  const projectDir = getProjectDir(id);

  if (!fs.existsSync(projectDir)) {
    res.json([]);
    return;
  }

  const tree = buildFileTree(projectDir);
  res.json(tree);
});

router.post("/projects/:projectId/files", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;
  const { path: filePath, type, content = "" } = req.body;

  if (!filePath || !type) {
    res.status(400).json({ error: "bad_request", message: "path and type are required" });
    return;
  }

  const fullPath = resolveSafePath(id, filePath);
  if (!fullPath) {
    res.status(400).json({ error: "bad_request", message: "Invalid path" });
    return;
  }

  fs.mkdirSync(path.dirname(fullPath), { recursive: true });

  if (type === "directory") {
    fs.mkdirSync(fullPath, { recursive: true });
    res.status(201).json({ name: path.basename(filePath), path: filePath, type: "directory" });
  } else {
    fs.writeFileSync(fullPath, content, "utf-8");
    const stats = fs.statSync(fullPath);
    res.status(201).json({
      name: path.basename(filePath),
      path: filePath,
      type: "file",
      size: stats.size,
      extension: path.extname(filePath).slice(1),
    });
  }
});

router.get("/projects/:projectId/files/content", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;
  const filePath = req.query.path as string;

  if (!filePath) {
    res.status(400).json({ error: "bad_request", message: "path query param is required" });
    return;
  }

  const fullPath = resolveSafePath(id, filePath);
  if (!fullPath) {
    res.status(400).json({ error: "bad_request", message: "Invalid path" });
    return;
  }

  if (!fs.existsSync(fullPath)) {
    res.status(404).json({ error: "not_found", message: "File not found" });
    return;
  }

  const content = fs.readFileSync(fullPath, "utf-8");
  const language = getLanguage(path.basename(filePath));

  res.json({ path: filePath, content, language });
});

router.put("/projects/:projectId/files/content", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;
  const { path: filePath, content } = req.body;

  if (!filePath || content === undefined) {
    res.status(400).json({ error: "bad_request", message: "path and content are required" });
    return;
  }

  const fullPath = resolveSafePath(id, filePath);
  if (!fullPath) {
    res.status(400).json({ error: "bad_request", message: "Invalid path" });
    return;
  }

  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, "utf-8");

  res.json({ success: true, message: "File saved" });
});

router.post("/projects/:projectId/files/delete", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;
  const { path: filePath } = req.body;

  if (!filePath) {
    res.status(400).json({ error: "bad_request", message: "path is required" });
    return;
  }

  const fullPath = resolveSafePath(id, filePath);
  if (!fullPath) {
    res.status(400).json({ error: "bad_request", message: "Invalid path" });
    return;
  }

  if (!fs.existsSync(fullPath)) {
    res.status(404).json({ error: "not_found", message: "File not found" });
    return;
  }

  const stat = fs.statSync(fullPath);
  if (stat.isDirectory()) {
    fs.rmSync(fullPath, { recursive: true, force: true });
  } else {
    fs.unlinkSync(fullPath);
  }

  res.json({ success: true, message: "Deleted" });
});

router.post("/projects/:projectId/files/rename", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;
  const { oldPath, newPath } = req.body;

  if (!oldPath || !newPath) {
    res.status(400).json({ error: "bad_request", message: "oldPath and newPath are required" });
    return;
  }

  const fullOldPath = resolveSafePath(id, oldPath);
  const fullNewPath = resolveSafePath(id, newPath);

  if (!fullOldPath || !fullNewPath) {
    res.status(400).json({ error: "bad_request", message: "Invalid path" });
    return;
  }

  if (!fs.existsSync(fullOldPath)) {
    res.status(404).json({ error: "not_found", message: "Source not found" });
    return;
  }

  fs.mkdirSync(path.dirname(fullNewPath), { recursive: true });
  fs.renameSync(fullOldPath, fullNewPath);

  res.json({ success: true, message: "Renamed" });
});

export default router;
