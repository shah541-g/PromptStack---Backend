import Joi from 'joi';
import { errorResponse } from '../protocols/response.protocols.js';

export const onboardingSchema = Joi.object({
  userName: Joi.string()
    .min(3)
    .max(30)
    .pattern(/^[a-zA-Z0-9_]+$/)
    .required()
    .messages({
      'string.empty': 'Username is required',
      'string.min': 'Username must be at least 3 characters',
      'string.max': 'Username cannot exceed 30 characters',
      'string.pattern.base': 'Username can only contain letters, numbers, and underscores'
    }),

  bio: Joi.string()
    .max(500)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Bio cannot exceed 500 characters'
    })
});

export function validateOnboardingDto(req, res, next) {
  const { error } = onboardingSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return errorResponse(res, {
      message: 'Validation error',
      error: error.details.map(d => d.message),
      statusCode: 400
    });
  }
  next();
}
