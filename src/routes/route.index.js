import { Router } from "express";
import UserRouter from "./users/users.routes.js"
import AuthRouter from "./auth/auth.routes.js"

const router = Router()

router.use("/users", UserRouter)
router.use("/auth", AuthRouter)

export default router;