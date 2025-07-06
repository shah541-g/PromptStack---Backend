
import Joi from "joi";
export const PromptOptimzerSchema = Joi.object({
    project_description: Joi.string().required().messages({
      'string.empty': 'project is required'
    }),
    requirements: Joi.array().items(
      Joi.object({
        title: Joi.string().required().messages({
          'string.empty': 'Title is required'
        }),
        description: Joi.string().required().messages({
          'string.empty': 'Description is required'
        })
      })
    ).required().messages({
      'array.base': 'Requirements must be an array',
      'array.empty': 'At least one requirement is required'
    }),
    
  });