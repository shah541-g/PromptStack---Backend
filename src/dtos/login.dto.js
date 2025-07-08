import Joi from 'joi';
import { errorResponse } from '../protocols/response.protocols.js';

export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.empty': 'Email is required',
    'string.email': 'Email must be a valid email address',
  }),
  password: Joi.string().min(6).required().messages({
    'string.empty': 'Password is required',
    'string.min': 'Password must be at least 6 characters',
  })
});

export function validateLoginDto(req, res, next) {
  const { error } = loginSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return errorResponse(res, {
      message: 'Validation error',
      error: error.details.map(d => d.message),
      statusCode: 400
    });
  }
  next();
}
