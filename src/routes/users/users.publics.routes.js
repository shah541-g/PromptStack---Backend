import { Router } from "express";
import User from "../../models/users.models.js";

const router = Router();

router.get('/search/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findByUsername(username);
    
    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: user.getPublicProfile()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to search user',
      error: error.message
    });
  }
});

export default router;