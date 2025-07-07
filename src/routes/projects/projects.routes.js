import Router from "express"
import { createProject, deleteProject, getProjectById, getProjectsByUserId } from "../../controllers/projects.controllers.js"
import { authenticateToken } from "../../middleware/auth.middleware.js";

const router = Router()

router.post("/", authenticateToken, createProject)
router.get("user-projects", authenticateToken, getProjectsByUserId)
router.get("/:id", authenticateToken, getProjectById)
router.delete("/:id", authenticateToken, deleteProject);

export default router;