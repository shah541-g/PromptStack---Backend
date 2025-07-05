import Router from "express"
import { createProject } from "../../controllers/projects.controllers.js"
import { authenticateToken } from "../../middleware/auth.middleware.js";

const router = Router()

router.post("/",authenticateToken, createProject)

export default router;