import { Router } from "express";
import { 
  register, 
  login, 
  continueWithGoogle, 
  continueWithGithub, 
  logout, 
  onBoarding
} from "../../controllers/auth.controllers.js";
import { 
  validateRegisterDto, 
  validateLoginDto, 
  validateGoogleAuthDto, 
  validateGithubAuthDto 
} from "../../dtos/index.js";
import { validateOnboardingDto } from "../../dtos/onBoarding_dto.js";

const router = Router();

router.post("/register", validateRegisterDto, register);
router.post("/login", validateLoginDto, login);
router.post("/onBoarding/:id", onBoarding);
router.post("/google", validateGoogleAuthDto, continueWithGoogle);
router.post("/github", validateGithubAuthDto, continueWithGithub);
router.post("/logout", logout);

export default router;