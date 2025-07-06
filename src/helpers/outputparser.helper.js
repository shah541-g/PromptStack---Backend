import Joi from 'joi';

class OutputParser {
  constructor() {
    this.jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/g;
  }

  extractJsonBlocks(text) {
    if (!text || typeof text !== 'string') {
      throw new Error('Text must be a non-empty string');
    }

    const jsonBlocks = [];
    let match;

    while ((match = this.jsonBlockRegex.exec(text)) !== null) {
      const jsonContent = match[1].trim();
      if (jsonContent) {
        jsonBlocks.push(jsonContent);
      }
    }

    return jsonBlocks;
  }

  parseAndValidate(jsonString, schema) {
    if (!jsonString || typeof jsonString !== 'string') {
      throw new Error('JSON string must be a non-empty string');
    }

    if (!schema || !schema.validate) {
      throw new Error('Schema must be a valid Joi schema');
    }

    let parsedJson;
    try {
      parsedJson = JSON.parse(jsonString);
    } catch (error) {
      throw new Error(`Invalid JSON format: ${error.message}`);
    }

    const { error, value } = schema.validate(parsedJson);
    if (error) {
      throw new Error(`Validation failed: ${error.details.map(d => d.message).join(', ')}`);
    }

    return value;
  }

  extractAndValidate(text, schema, options = {}) {
    const { returnAll = false, strict = false } = options;

    if (strict) {
      this.jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/g;
    } else {
      this.jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/g;
    }

    const jsonBlocks = this.extractJsonBlocks(text);
    
    if (jsonBlocks.length === 0) {
      throw new Error('No JSON blocks found in the text');
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < jsonBlocks.length; i++) {
      try {
        const validated = this.parseAndValidate(jsonBlocks[i], schema);
        results.push(validated);
      } catch (error) {
        errors.push(`Block ${i + 1}: ${error.message}`);
      }
    }

    if (results.length === 0) {
      throw new Error(`All JSON blocks failed validation:\n${errors.join('\n')}`);
    }

    if (returnAll) {
      return {
        results,
        errors: errors.length > 0 ? errors : null,
        totalBlocks: jsonBlocks.length,
        validBlocks: results.length
      };
    }

    return results[0];
  }

  createSchema(schemaDefinition) {
    return Joi.object(schemaDefinition);
  }

  static get CommonSchemas() {
    return {
      userData: Joi.object({
        name: Joi.string().required(),
        email: Joi.string().email().required(),
        age: Joi.number().integer().min(0).optional()
      }),

      apiResponse: Joi.object({
        success: Joi.boolean().required(),
        data: Joi.any().optional(),
        message: Joi.string().optional(),
        error: Joi.string().optional()
      }),

      config: Joi.object({
        version: Joi.string().required(),
        settings: Joi.object().optional(),
        features: Joi.array().items(Joi.string()).optional()
      })
    };
  }
}

export default OutputParser;
