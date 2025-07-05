import Joi from 'joi';
import { errorResponse } from '../protocols/response.protocols.js';

export const updateProfileSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).optional().messages({
    'string.min': 'First name must be at least 2 characters',
    'string.max': 'First name cannot exceed 50 characters'
  }),
  lastName: Joi.string().min(2).max(50).optional().messages({
    'string.min': 'Last name must be at least 2 characters',
    'string.max': 'Last name cannot exceed 50 characters'
  }),
  username: Joi.string().min(3).max(30).pattern(/^[a-zA-Z0-9_]+$/).optional().messages({
    'string.min': 'Username must be at least 3 characters',
    'string.max': 'Username cannot exceed 30 characters',
    'string.pattern.base': 'Username can only contain letters, numbers, and underscores'
  }),
  bio: Joi.string().max(500).optional().messages({
    'string.max': 'Bio cannot exceed 500 characters'
  }),
  avatar: Joi.string().uri().optional().messages({
    'string.uri': 'Avatar must be a valid URL'
  })
});

export function validateUpdateProfileDto(req, res, next) {
  const { error } = updateProfileSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return errorResponse(res, {
      message: 'Validation error',
      error: error.details.map(d => d.message),
      statusCode: 400
    });
  }
  next();
} 