import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const PROJECTS_ROOT =
    process.env.PROJECTS_ROOT || path.join(process.cwd(), "user-projects");

function getProjectDir(projectId: string): string {
    return path.join(PROJECTS_ROOT, projectId);
}

/**
 * Resolve a user-provided relative path into an absolute path,
 * ensuring it stays within the project directory (prevents traversal attacks).
 */
function resolveSafePath(
    projectId: string,
    filePath: string
): string | null {
    const projectDir = getProjectDir(projectId);
    const normalizedPath = path.normalize(filePath).replace(/^[/\\]/, "");
    const fullPath = path.join(projectDir, normalizedPath);
    if (!fullPath.startsWith(projectDir)) return null;
    return fullPath;
}

// ── File tree builder ────────────────────────────────────────────

function buildFileTree(
    dirPath: string,
    basePath: string = "/",
    depth: number = 0
): string {
    if (!fs.existsSync(dirPath) || depth > 5) return "";

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const lines: string[] = [];
    const indent = "  ".repeat(depth);

    // Sort: directories first, then files
    const sorted = entries.sort((a, b) => {
        if (a.isDirectory() !== b.isDirectory())
            return a.isDirectory() ? -1 : 1;
        return a.name.localeCompare(b.name);
    });

    for (const entry of sorted) {
        if (entry.name === "node_modules" || entry.name === ".git") continue;

        if (entry.isDirectory()) {
            lines.push(`${indent}📁 ${entry.name}/`);
            lines.push(
                buildFileTree(
                    path.join(dirPath, entry.name),
                    path.join(basePath, entry.name),
                    depth + 1
                )
            );
        } else {
            lines.push(`${indent}📄 ${entry.name}`);
        }
    }

    return lines.filter(Boolean).join("\n");
}

// ── Tool executor ────────────────────────────────────────────────

export async function executeTool(
    name: string,
    args: Record<string, any>,
    projectId: string
): Promise<string> {
    const projectDir = getProjectDir(projectId);

    switch (name) {
        // ── Read-Only Tools ──
        case "get_file_content": {
            const fullPath = resolveSafePath(projectId, args.path);
            if (!fullPath) return `Error: Invalid path "${args.path}"`;
            if (!fs.existsSync(fullPath))
                return `Error: File not found "${args.path}"`;
            try {
                return fs.readFileSync(fullPath, "utf-8");
            } catch (err: any) {
                return `Error reading file: ${err.message}`;
            }
        }

        case "list_directory": {
            const dirPath = args.path
                ? resolveSafePath(projectId, args.path)
                : projectDir;
            if (!dirPath) return `Error: Invalid path "${args.path}"`;
            if (!fs.existsSync(dirPath))
                return `Error: Directory not found "${args.path}"`;

            try {
                const entries = fs.readdirSync(dirPath, { withFileTypes: true });
                const items = entries
                    .filter((e) => e.name !== "node_modules" && e.name !== ".git")
                    .sort((a, b) => {
                        if (a.isDirectory() !== b.isDirectory())
                            return a.isDirectory() ? -1 : 1;
                        return a.name.localeCompare(b.name);
                    })
                    .map((e) => {
                        if (e.isDirectory()) return `📁 ${e.name}/`;
                        const stats = fs.statSync(path.join(dirPath, e.name));
                        return `📄 ${e.name}  (${stats.size} bytes)`;
                    });
                return items.join("\n") || "(empty directory)";
            } catch (err: any) {
                return `Error listing directory: ${err.message}`;
            }
        }

        case "get_project_structure": {
            if (!fs.existsSync(projectDir))
                return "Error: Project directory not found";
            return buildFileTree(projectDir) || "(empty project)";
        }

        case "search_in_files": {
            if (!fs.existsSync(projectDir)) return "Error: Project not found";

            const query = args.query as string;
            const caseSensitive = args.caseSensitive === true;
            const filePattern = args.filePattern as string | undefined;
            const results: string[] = [];

            function searchDir(dir: string, rel: string) {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                for (const entry of entries) {
                    const full = path.join(dir, entry.name);
                    const relPath = path.join(rel, entry.name);

                    if (entry.isDirectory()) {
                        if (entry.name === "node_modules" || entry.name === ".git")
                            continue;
                        searchDir(full, relPath);
                    } else if (entry.isFile()) {
                        if (filePattern) {
                            const pat = filePattern
                                .replace(/\./g, "\\.")
                                .replace(/\*/g, ".*");
                            if (!new RegExp(pat).test(entry.name)) continue;
                        }
                        const textExts = [
                            "html", "css", "js", "jsx", "ts", "tsx", "json", "md",
                            "txt", "yaml", "yml", "xml", "sh", "py", "rb",
                        ];
                        const ext = path.extname(entry.name).slice(1).toLowerCase();
                        if (!textExts.includes(ext) && ext) continue;

                        try {
                            const content = fs.readFileSync(full, "utf-8");
                            const lines = content.split("\n");
                            lines.forEach((line, idx) => {
                                const haystack = caseSensitive ? line : line.toLowerCase();
                                const needle = caseSensitive ? query : query.toLowerCase();
                                if (haystack.includes(needle)) {
                                    results.push(`${relPath}:${idx + 1}: ${line.trim()}`);
                                }
                            });
                        } catch { /* skip binary/unreadable files */ }
                    }
                }
            }

            searchDir(projectDir, "");
            if (results.length === 0) return `No matches found for "${query}"`;
            return results.slice(0, 100).join("\n");
        }

        // ── Edit Tools ──
        case "write_file":
        case "create_file": {
            const fullPath = resolveSafePath(projectId, args.path);
            if (!fullPath) return `Error: Invalid path "${args.path}"`;
            try {
                fs.mkdirSync(path.dirname(fullPath), { recursive: true });
                fs.writeFileSync(fullPath, args.content, "utf-8");
                return `Successfully wrote ${args.content.length} characters to "${args.path}"`;
            } catch (err: any) {
                return `Error writing file: ${err.message}`;
            }
        }

        case "delete_file": {
            const fullPath = resolveSafePath(projectId, args.path);
            if (!fullPath) return `Error: Invalid path "${args.path}"`;
            if (!fs.existsSync(fullPath))
                return `Error: File not found "${args.path}"`;
            try {
                fs.unlinkSync(fullPath);
                return `Successfully deleted "${args.path}"`;
            } catch (err: any) {
                return `Error deleting file: ${err.message}`;
            }
        }

        // ── Execution Tools ──
        case "run_command": {
            if (!fs.existsSync(projectDir))
                return "Error: Project directory not found";

            try {
                const isWindows = process.platform === "win32";
                const { stdout, stderr } = await execAsync(args.command, {
                    cwd: projectDir,
                    timeout: 30000,
                    maxBuffer: 1024 * 1024 * 5,
                    shell: isWindows ? "powershell.exe" : undefined,
                    env: {
                        ...process.env,
                        PATH:
                            process.env.PATH +
                            (isWindows ? "" : ":/usr/local/bin:/usr/bin:/bin"),
                    },
                });

                let result = "";
                if (stdout) result += `stdout:\n${stdout.slice(0, 5000)}\n`;
                if (stderr) result += `stderr:\n${stderr.slice(0, 2000)}\n`;
                if (!result) result = "(command completed with no output)";
                return result;
            } catch (err: any) {
                let result = "";
                if (err.stdout) result += `stdout:\n${err.stdout.slice(0, 5000)}\n`;
                if (err.stderr) result += `stderr:\n${err.stderr.slice(0, 2000)}\n`;
                result += `Exit code: ${err.code || 1}`;
                return result || `Command failed: ${err.message}`;
            }
        }

        default:
            return `Error: Unknown tool "${name}"`;
    }
}
