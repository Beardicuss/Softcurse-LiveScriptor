const { spawn } = require("child_process");
const path = require("path");

// Prevent pnpm/npm from forcing Electron to run in headless Node mode.
// When running package scripts, pnpm injects this variable.
delete process.env.ELECTRON_RUN_AS_NODE;

// Spawn electron passing '.' as the argument to load the app from the current directory.
const child = spawn(
    path.join(__dirname, "..", "node_modules", ".bin", "electron"),
    ["."],
    {
        stdio: "inherit",
        shell: true,
    }
);

child.on("close", (code) => {
    process.exit(code);
});
