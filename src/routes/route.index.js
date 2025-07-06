import { Router } from "express";
import UserRouter from "./users/users.routes.js"
import AuthRouter from "./auth/auth.routes.js"
import ProjectRouter from "./projects/projects.routes.js"
import PromptRouter from "./prompt/prompt.routes.js"
import AgentRouter from "./agent/agent.routes.js"
const router = Router()

router.use("/users", UserRouter)
router.use("/auth", AuthRouter)
router.use("/projects", ProjectRouter)
router.use("/prompts", PromptRouter)
router.use("/agents", AgentRouter )

export default router;