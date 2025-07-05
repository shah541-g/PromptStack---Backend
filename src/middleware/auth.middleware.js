import jwt from 'jsonwebtoken';
import config from '../config.cjs';
import { errorResponse } from '../protocols/response.protocols.js';

const { JWT_CONFIG } = config;

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return errorResponse(res, {
      message: 'Access token required',
      statusCode: 401
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_CONFIG.SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return errorResponse(res, {
      message: 'Invalid or expired token',
      statusCode: 403
    });
  }
}; 