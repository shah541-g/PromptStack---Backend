import Router from "express"
import { generate, testConnection } from "../../controllers/agent.controllers.js";
import { authenticateToken } from "../../middleware/auth.middleware.js";

const router = Router();

// router.get("/test-connection", testConnection);
router.post("/generate/:projectId", authenticateToken ,generate)

export default router;