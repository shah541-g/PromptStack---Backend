import Router from "express"
import { promptToSrs } from "../../controllers/prompts-optimizer.controllers.js"
import { authenticateToken } from "../../middleware/auth.middleware.js";

const router = Router()

router.post("/prompt-to-srs", promptToSrs)

export default router;