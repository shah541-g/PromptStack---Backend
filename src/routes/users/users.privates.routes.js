import { Router } from "express";
import { 
  getProfile, 
  updateProfile,  
  deleteAccount 
} from "../../controllers/users.controllers.js";
import { 
  validateUpdateProfileDto, 
} from "../../dtos/index.js";

const router = Router();

router.get('/profile', getProfile);
router.put('/profile', validateUpdateProfileDto, updateProfile);

router.delete('/account', deleteAccount);

export default router;