import User from '../models/users.models.js';
import { successResponse, errorResponse } from '../protocols/response.protocols.js';

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
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
      message: 'Failed to get profile',
      error: error.message,
      statusCode: 500
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, username, bio, avatar } = req.body;
    const updateData = {};

    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (bio !== undefined) updateData.bio = bio;
    if (avatar !== undefined) updateData.avatar = avatar;

    if (username) {
      const usernameExists = await User.usernameExists(username);
      if (usernameExists) {
        return errorResponse(res, {
          message: 'Username already taken',
          statusCode: 400
        });
      }
      updateData.username = username;
    }

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!user) {
      return errorResponse(res, {
        message: 'User not found',
        statusCode: 404
      });
    }

    return successResponse(res, {
      message: 'Profile updated successfully',
      data: {
        user: user.getPublicProfile()
      }
    });
  } catch (error) {
    return errorResponse(res, {
      message: 'Failed to update profile',
      error: error.message,
      statusCode: 500
    });
  }
};

export const deleteAccount = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { isActive: false },
      { new: true }
    );

    if (!user) {
      return errorResponse(res, {
        message: 'User not found',
        statusCode: 404
      });
    }

    return successResponse(res, {
      message: 'Account deactivated successfully'
    });
  } catch (error) {
    return errorResponse(res, {
      message: 'Failed to deactivate account',
      error: error.message,
      statusCode: 500
    });
  }
};


