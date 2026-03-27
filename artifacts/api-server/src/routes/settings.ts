import { Router, type IRouter } from "express";
import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

/** GET /api/settings — return all settings as a key-value object */
router.get("/settings", async (_req, res): Promise<void> => {
    const rows = await db.select().from(settingsTable);
    const settings: Record<string, string> = {};
    for (const row of rows) {
        settings[row.key] = row.value;
    }
    res.json(settings);
});

/** PUT /api/settings — upsert one or more settings */
router.put("/settings", async (req, res): Promise<void> => {
    const entries = req.body as Record<string, string>;

    if (!entries || typeof entries !== "object") {
        res.status(400).json({ error: "bad_request", message: "Body must be a JSON object of key-value pairs" });
        return;
    }

    for (const [key, value] of Object.entries(entries)) {
        await db
            .insert(settingsTable)
            .values({ key, value: String(value) })
            .onConflictDoUpdate({ target: settingsTable.key, set: { value: String(value) } });
    }

    res.json({ success: true, message: "Settings saved" });
});

/** DELETE /api/settings/:key — remove a specific setting */
router.delete("/settings/:key", async (req, res): Promise<void> => {
    const key = req.params.key as string;
    await db.delete(settingsTable).where(eq(settingsTable.key, key));
    res.json({ success: true, message: "Setting deleted" });
});

export default router;
