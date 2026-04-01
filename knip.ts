import type { KnipConfig } from "knip";

const config: KnipConfig = {
    workspaces: {
        ".": {
            entry: ["electron/main.ts"],
            project: ["electron/**/*.ts"],
            ignore: ["release/**", "dist/**"]
        },
        "artifacts/api-server": {
            entry: "src/index.ts",
            project: ["src/**/*.ts"]
        },
        "artifacts/livescriptor": {
            entry: "src/main.tsx",
            project: ["src/**/*.{ts,tsx}"]
        },
        "lib/db": {
            entry: "src/index.ts",
            project: ["src/**/*.ts"],
            ignore: ["drizzle.config.ts"]
        }
    },
    ignoreBinaries: ["wait-on"],
    ignoreDependencies: ["@emnapi/core", "@emnapi/runtime", "electron-builder-squirrel-windows", "better-sqlite3"],
    drizzle: false
};

export default config;
