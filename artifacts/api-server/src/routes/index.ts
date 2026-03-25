import { Router, type IRouter } from "express";
import healthRouter from "./health";
import projectsRouter from "./projects";
import filesRouter from "./files";
import terminalRouter from "./terminal";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(projectsRouter);
router.use(filesRouter);
router.use(terminalRouter);
router.use(aiRouter);

export default router;
