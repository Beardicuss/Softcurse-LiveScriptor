import app from "./app";
import { logger } from "./lib/logger";

const port = Number(process.env.PORT) || 3000;

export function startServer(overridePort?: number): Promise<void> {
  const listenPort = overridePort ?? port;
  return new Promise((resolve, reject) => {
    app.listen(listenPort, (err) => {
      if (err) {
        logger.error({ err }, "Error listening on port");
        reject(err);
        return;
      }
      logger.info({ port: listenPort }, "Server listening");
      resolve();
    });
  });
}

// When run directly (not imported by Electron), start immediately
if (process.env.ELECTRON !== "true") {
  startServer().catch(() => process.exit(1));
}

export default app;
