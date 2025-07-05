import jwt from 'jsonwebtoken';
import User from '../models/users.models.js';
import config from '../config.cjs';

const { JWT_CONFIG } = config;

const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_CONFIG.SECRET, {
    expiresIn: JWT_CONFIG.EXPIRES_IN
  });
};

export const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, username } = req.body;

    const emailExists = await User.emailExists(email);
    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    if (username) {
      const usernameExists = await User.usernameExists(username);
      if (usernameExists) {
        return res.status(400).json({
          success: false,
          message: 'Username already taken'
        });
      }
    }

    const user = new User({
      firstName,
      lastName,
      email,
      password,
      username
    });

    await user.save();

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: user.getPublicProfile(),
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findByEmail(email).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.getPublicProfile(),
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
};

export const continueWithGoogle = async (req, res) => {
  try {
    const { googleId, email, firstName, lastName, avatar } = req.body;

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

    res.status(200).json({
      success: true,
      message: 'Google authentication successful',
      data: {
        user: user.getPublicProfile(),
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Google authentication failed',
      error: error.message
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

    res.status(200).json({
      success: true,
      message: 'GitHub authentication successful',
      data: {
        user: user.getPublicProfile(),
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'GitHub authentication failed',
      error: error.message
    });
  }
};

export const logout = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Logout failed',
      error: error.message
    });
  }
};
