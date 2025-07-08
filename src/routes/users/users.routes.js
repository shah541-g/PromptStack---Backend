import { Router } from "express";
import { authenticateToken } from "../../middleware/auth.middleware.js";
import PublicRouter from "./users.publics.routes.js"
import PrivateRouter from "./users.privates.routes.js"

const router = Router()

router.use("/private", authenticateToken, PrivateRouter)
router.use("/public", PublicRouter)

export default router;