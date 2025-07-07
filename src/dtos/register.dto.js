import Joi from 'joi';
import { errorResponse } from '../protocols/response.protocols.js';

export const registerSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).required().messages({
    'string.empty': 'First name is required',
    'string.min': 'First name must be at least 2 characters',
    'string.max': 'First name cannot exceed 50 characters'
  }),
  lastName: Joi.string().min(2).max(50).required().messages({
    'string.empty': 'Last name is required',
    'string.min': 'Last name must be at least 2 characters',
    'string.max': 'Last name cannot exceed 50 characters'
  }),
  email: Joi.string().email().required().messages({
    'string.empty': 'Email is required',
    'string.email': 'Email must be a valid email address'
  }),
  password: Joi.string().min(8).required().messages({
    'string.empty': 'Password is required',
    'string.min': 'Password must be at least 8 characters'
  }),
  // username: Joi.string().min(3).max(30).pattern(/^[a-zA-Z0-9_]+$/).optional().messages({
  //   'string.min': 'Username must be at least 3 characters',
  //   'string.max': 'Username cannot exceed 30 characters',
  //   'string.pattern.base': 'Username can only contain letters, numbers, and underscores'
  // })
});

export function validateRegisterDto(req, res, next) {
  const { error } = registerSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return errorResponse(res, {
      message: 'Validation error',
      error: error.details.map(d => d.message),
      statusCode: 400
    });
  }
  next();
} 