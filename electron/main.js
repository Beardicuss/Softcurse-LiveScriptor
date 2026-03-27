// Fix for pnpm: the electron npm package's index.js shadows Electron's
// built-in 'electron' module. We patch Module._load to intercept
// require('electron') and delegate to Electron's internal loader.
const Module = require("module");
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
    if (request === "electron") {
        // Delete any cached resolution of the npm 'electron' package
        const cached = Module._cache && Object.keys(Module._cache).find(
            (k) => k.includes("node_modules") && k.endsWith("electron/index.js")
        );
        if (cached) delete Module._cache[cached];

        // Use Electron's internal binding to get the built-in module
        try {
            return process._linkedBinding("electron_common_features")
                ? originalLoad.call(this, request, null, false)
                : originalLoad.call(this, request, parent, isMain);
        } catch {
            return originalLoad.call(this, request, parent, isMain);
        }
    }
    return originalLoad.call(this, request, parent, isMain);
};

const { app, BrowserWindow, shell } = require("electron");
const path = require("path");
const net = require("net");

const isDev = !app.isPackaged;

function getFreePort() {
    return new Promise((resolve, reject) => {
        const srv = net.createServer();
        srv.listen(0, () => {
            const addr = srv.address();
            if (addr && typeof addr === "object") {
                const port = addr.port;
                srv.close(() => resolve(port));
            } else {
                reject(new Error("Could not get address from server"));
            }
        });
        srv.on("error", reject);
    });
}

let mainWindow = null;

async function createWindow(apiPort) {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 900,
        minHeight: 600,
        title: "Softcurse LiveScriptor",
        icon: path.join(__dirname, "..", "assets", "icon.png"),
        backgroundColor: "#020202",
        show: false,
        webPreferences: {
            preload: path.join(__dirname, "preload.cjs"),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: "deny" };
    });

    mainWindow.once("ready-to-show", () => {
        mainWindow?.show();
    });

    if (isDev) {
        mainWindow.loadURL("http://localhost:5173");
        mainWindow.webContents.openDevTools({ mode: "detach" });
    } else {
        mainWindow.loadURL(`http://localhost:${apiPort}`);
    }

    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}

async function startApiServer(port) {
    const userDataPath = app.getPath("userData");
    process.env.PORT = String(port);
    process.env.PROJECTS_ROOT = path.join(userDataPath, "projects");
    process.env.DB_PATH = path.join(userDataPath, "livescriptor.db");

    if (!isDev) {
        const serverPath = path.resolve(__dirname, "..", "server", "index.mjs");
        const { default: appExpress } = await import(serverPath);

        const express = require("express");
        const staticPath = path.join(__dirname, "..", "renderer");
        appExpress.use(express.static(staticPath));
        appExpress.get("*", (_req, res) => {
            res.sendFile(path.join(staticPath, "index.html"));
        });

        return new Promise((resolve, reject) => {
            appExpress.listen(port, (err) => {
                if (err) reject(err);
                else {
                    console.log(`[Electron] API server listening on port ${port}`);
                    resolve();
                }
            });
        });
    } else {
        console.log("[Electron] Dev mode — API server runs separately via concurrently");
    }
}

app.whenReady().then(async () => {
    try {
        const apiPort = isDev ? 3000 : await getFreePort();
        await startApiServer(apiPort);
        await createWindow(apiPort);
    } catch (err) {
        console.error("[Electron] Failed to start:", err);
        app.quit();
    }
});

app.on("window-all-closed", () => {
    app.quit();
});

app.on("activate", () => {
    if (mainWindow === null) {
        getFreePort().then((port) => createWindow(port));
    }
});
