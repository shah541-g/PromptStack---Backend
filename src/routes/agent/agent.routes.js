import Router from "express"
import { generate, testConnection } from "../../controllers/agent.controllers.js";

const router = Router();

router.get("/test-connection", testConnection);
router.post("/generate/:projectId", generate)

export default router;