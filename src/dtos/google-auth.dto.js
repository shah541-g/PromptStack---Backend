import Joi from 'joi';
import { errorResponse } from '../protocols/response.protocols.js';

export const googleAuthSchema = Joi.object({
  googleId: Joi.string().required().messages({
    'string.empty': 'Google ID is required'
  }),
  email: Joi.string().email().required().messages({
    'string.empty': 'Email is required',
    'string.email': 'Email must be a valid email address'
  }),
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
  avatar: Joi.string().uri().optional().messages({
    'string.uri': 'Avatar must be a valid URL'
  })
});

export function validateGoogleAuthDto(req, res, next) {
  const { error } = googleAuthSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return errorResponse(res, {
      message: 'Validation error',
      error: error.details.map(d => d.message),
      statusCode: 400
    });
  }
  next();
} 