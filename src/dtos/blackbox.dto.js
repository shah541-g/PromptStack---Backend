
import Joi from "joi";


export const BlackboxOutputSehema = Joi.object({
    
    "remarks": Joi.string().required(),
    success: Joi.boolean().required(),
    code: Joi.array().items(
      Joi.object({
        path: Joi.string().optional(),
          tool: Joi.string().valid('create', 'edit', 'delete', 'read').required().messages({
      'string.empty': 'Tool is required',
      'any.only': 'Tool must be one of: create, edit, delete, read'
    }),
        code: Joi.string().allow('').optional(),
          start: Joi.number().allow(null).default(0),
        end: Joi.number().allow(null).default(0)
      })
    ).min(0).required().messages({
      'array.base': 'Requirements must be an array',
      'array.empty': 'You may send an empty array to indicate all tasks are complete'
    }),
    
  });