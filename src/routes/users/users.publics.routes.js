import { Router } from "express";
import User from "../../models/users.models.js";
import { successResponse, errorResponse } from "../../protocols/response.protocols.js";

const router = Router();

router.get('/search/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findByUsername(username);
    
    if (!user || !user.isActive) {
      return errorResponse(res, {
        message: 'User not found',
        statusCode: 404
      });
    }

    return successResponse(res, {
      data: {
        user: user.getPublicProfile()
      }
    });
  } catch (error) {
    return errorResponse(res, {
      message: 'Failed to search user',
      error: error.message,
      statusCode: 500
    });
  }
});

export default router;