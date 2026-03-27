import { buildSync } from "esbuild";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

buildSync({
    entryPoints: [
        path.resolve(__dirname, "main.ts"),
        path.resolve(__dirname, "preload.ts"),
    ],
    outdir: path.resolve(__dirname, "dist"),
    format: "cjs",
    platform: "node",
    target: "node20",
    bundle: true,
    external: [
        "electron",
        "express",
        "better-sqlite3",
        "*.node",
    ],
    sourcemap: true,
});

console.log("Electron files compiled to electron/dist/");
