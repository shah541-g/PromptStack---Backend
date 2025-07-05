import { Router } from "express";
import UserRouter from "./users/users.routes.js"
import AuthRouter from "./auth/auth.routes.js"
import ProjectRouter from "./projects/projects.routes.js"

const router = Router()

router.use("/users", UserRouter)
router.use("/auth", AuthRouter)
router.use("/projects", ProjectRouter)

export default router;