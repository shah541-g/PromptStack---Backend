import Router from "express"
import { generate, testConnection, getAgentChatsByProject } from "../../controllers/agent.controllers.js";
import { authenticateToken } from "../../middleware/auth.middleware.js";

const router = Router();

// router.get("/test-connection", testConnection);
router.post("/generate/:projectId", authenticateToken ,generate)
router.get("/chats", getAgentChatsByProject);

export default router;