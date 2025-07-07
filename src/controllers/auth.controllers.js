import jwt from 'jsonwebtoken';
import User from '../models/users.models.js';
import config from '../config.cjs';
import { successResponse, errorResponse } from '../protocols/response.protocols.js';

const { JWT_CONFIG } = config;

const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_CONFIG.SECRET, {
    expiresIn: JWT_CONFIG.EXPIRES_IN
  });
};

export const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    const emailExists = await User.emailExists(email);
    if (emailExists) {
      return errorResponse(res, {
        message: 'Email already registered',
        statusCode: 400
      });
    }

    const index = Math.floor(Math.random() * 100) + 1;
    const randomAvatar = `https://avatar.iran.liara.run/public/${index}`;
    const user = new User({
      firstName,
      lastName,
      email,
      password,
      avatar:randomAvatar
    });
    await user.save();

    const token = generateToken(user._id);

    return successResponse(res, {
      message: 'User registered successfully',
      data: {
        user: user.getPublicProfile(),
        token
      },
      statusCode: 201
    });
  } catch (error) {
    return errorResponse(res, {
      message: 'Registration failed',
      error: error.message,
      statusCode: 500
    });
  }
};

export const onBoarding = async (req, res) => {
  const { id } = req.params;
  const { userName, bio, avatar } = req.body;

  try {
    const findUser = await User.findById(id);

    if (!findUser) {
      return errorResponse(res, {
        message: "User not found",
        statusCode: 404
      });
    }

    findUser.username = userName;
    findUser.bio = bio;
    if (avatar) findUser.avatar = avatar;
    findUser.onboarding = true;

    await findUser.save();

    return successResponse(res, {
      message: "User onboarded successfully",
      data: {
        user: findUser.getPublicProfile()
      },
      statusCode: 200
    });

  } catch (error) {
    return errorResponse(res, {
      message: "Onboarding failed",
      error: error.message,
      statusCode: 500
    });
  }
};


export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findByEmail(email).select('+password');
    if (!user) {
      return errorResponse(res, {
        message: 'Invalid credentials',
        statusCode: 401
      });
    }

    if (!user.isActive) {
      return errorResponse(res, {
        message: 'Account is deactivated',
        statusCode: 401
      });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return errorResponse(res, {
        message: 'Invalid credentials',
        statusCode: 401
      });
    }

    const token = generateToken(user._id);

    return successResponse(res, {
      message: 'Login successful',
      data: {
        user: user.getPublicProfile(),
        token
      }
    });
  } catch (error) {
    return errorResponse(res, {
      message: 'Login failed',
      error: error.message,
      statusCode: 500
    });
  }
};

export const continueWithGoogle = async (req, res) => {
  try {
    const { googleId, email, firstName, lastName, avatar } = req.body;
    // console.log(`data from backend ${googleId}\n${email}\n${firstName+ " "+ lastName}\n${avatar}`,)
    let user = await User.findOne({
      'socialAccounts.provider': 'google',
      'socialAccounts.providerId': googleId
    });

    if (!user) {
      user = await User.findOne({ email });
      
      if (user) {
        user.socialAccounts.push({
          provider: 'google',
          providerId: googleId,
          providerEmail: email
        });
        await user.save();
      } else {
        user = new User({
          firstName,
          lastName,
          email,
          avatar,
          isEmailVerified: true,
          socialAccounts: [{
            provider: 'google',
            providerId: googleId,
            providerEmail: email
          }]
        });
        await user.save();
      }
    }

    const token = generateToken(user._id);

    return successResponse(res, {
      message: 'Google authentication successful',
      data: {
        user: user.getPublicProfile(),
        token
      }
    });
  } catch (error) {
    return errorResponse(res, {
      message: 'Google authentication failed',
      error: error.message,
      statusCode: 500
    });
  }
};

export const continueWithGithub = async (req, res) => {
  try {
    const { githubId, email, firstName, lastName, avatar, username } = req.body;

    let user = await User.findOne({
      'socialAccounts.provider': 'github',
      'socialAccounts.providerId': githubId
    });

    if (!user) {
      user = await User.findOne({ email });
      
      if (user) {
        user.socialAccounts.push({
          provider: 'github',
          providerId: githubId,
          providerEmail: email
        });
        await user.save();
      } else {
        const userData = {
          firstName,
          lastName,
          email,
          avatar,
          isEmailVerified: true,
          socialAccounts: [{
            provider: 'github',
            providerId: githubId,
            providerEmail: email
          }]
        };

        if (username) {
          const usernameExists = await User.usernameExists(username);
          if (!usernameExists) {
            userData.username = username;
          }
        }

        user = new User(userData);
        await user.save();
      }
    }

    const token = generateToken(user._id);

    return successResponse(res, {
      message: 'GitHub authentication successful',
      data: {
        user: user.getPublicProfile(),
        token
      }
    });
  } catch (error) {
    return errorResponse(res, {
      message: 'GitHub authentication failed',
      error: error.message,
      statusCode: 500
    });
  }
};

export const logout = async (req, res) => {
  try {
    return successResponse(res, {
      message: 'Logout successful'
    });
  } catch (error) {
    return errorResponse(res, {
      message: 'Logout failed',
      error: error.message,
      statusCode: 500
    });
  }
};
