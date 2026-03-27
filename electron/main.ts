import { app, BrowserWindow, shell } from "electron";
import path from "path";
import net from "net";
const isDev = !app.isPackaged;

/** Find a free TCP port */
function getFreePort(): Promise<number> {
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

let mainWindow: BrowserWindow | null = null;

async function createWindow(apiPort: number) {
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
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }: { url: string }) => {
    shell.openExternal(url);
    return { action: "deny" as const };
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

async function startApiServer(port: number) {
  const userDataPath = app.getPath("userData");
  process.env.PORT = String(port);
  process.env.PROJECTS_ROOT = path.join(userDataPath, "projects");
  process.env.DB_PATH = path.join(userDataPath, "livescriptor.db");

  // Dynamically import the api-server app
  // In dev: load from source via tsx
  // In production: load from bundled server
  const serverPath = isDev
    ? path.resolve(__dirname, "..", "artifacts", "api-server", "src", "app.ts")
    : path.resolve(__dirname, "..", "server", "index.mjs");

  const { default: appExpress } = await import(serverPath);

  if (!isDev) {
    // In production, serve the built React frontend
    const express = await import("express");
    const staticPath = path.join(__dirname, "..", "renderer");
    appExpress.use(express.default.static(staticPath));
    appExpress.get("*", (_req: any, res: any) => {
      res.sendFile(path.join(staticPath, "index.html"));
    });
  }

  return new Promise<void>((resolve, reject) => {
    appExpress.listen(port, (err?: Error) => {
      if (err) reject(err);
      else {
        console.log(`[Electron] API server listening on port ${port}`);
        resolve();
      }
    });
  });
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
