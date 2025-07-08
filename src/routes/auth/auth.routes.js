import { Router } from "express";
import { 
  register, 
  login, 
  continueWithGoogle, 
  continueWithGithub, 
  logout 
} from "../../controllers/auth.controllers.js";
import { 
  validateRegisterDto, 
  validateLoginDto, 
  validateGoogleAuthDto, 
  validateGithubAuthDto 
} from "../../dtos/index.js";

const router = Router();

router.post("/register", validateRegisterDto, register);
router.post("/login", validateLoginDto, login);
router.post("/google", validateGoogleAuthDto, continueWithGoogle);
router.post("/github", validateGithubAuthDto, continueWithGithub);
router.post("/logout", logout);

export default router;