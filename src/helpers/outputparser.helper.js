import Joi from 'joi';

class OutputParser {
  constructor() {
    // Prefer triple backtick with json, then any triple backtick, then any code block, then plain JSON
    // Allow optional newline or whitespace after the opening backticks
    this.jsonBlockRegex = /```json\s*\n?([\s\S]*?)\s*```/g;
    this.anyTripleBacktickRegex = /```[a-zA-Z]*\s*\n?([\s\S]*?)\s*```/g;
    this.anyCodeBlockRegex = /`{3,}|'{3,}|~{3,}|\[{3,}|\({3,}|\{{3,}\s*\n?([\s\S]*?)[`'~\[\(\{]{3,}/g;
  }

  extractJsonBlocks(text) {
    if (!text || typeof text !== 'string') {
      throw new Error('Text must be a non-empty string');
    }

    const jsonBlocks = [];
    let match;

    // 1. Prefer triple backtick with json
    while ((match = this.jsonBlockRegex.exec(text)) !== null) {
      const jsonContent = match[1].trim();
      if (jsonContent && jsonContent.startsWith('{')) {
        const cleanedContent = this.cleanJsonString(jsonContent);
        jsonBlocks.push(cleanedContent);
      }
    }
    // 2. If none found, try any triple backtick code block
    if (jsonBlocks.length === 0) {
      while ((match = this.anyTripleBacktickRegex.exec(text)) !== null) {
        const codeContent = match[1].trim();
        if (codeContent && codeContent.startsWith('{')) {
          const cleanedContent = this.cleanJsonString(codeContent);
          jsonBlocks.push(cleanedContent);
        }
      }
    }
    // 3. If still none found, try any code block (other delimiters)
    if (jsonBlocks.length === 0) {
      while ((match = this.anyCodeBlockRegex.exec(text)) !== null) {
        const codeContent = match[1].trim();
        if (codeContent && codeContent.startsWith('{')) {
          const cleanedContent = this.cleanJsonString(codeContent);
          jsonBlocks.push(cleanedContent);
        }
      }
    }
    // 4. If still none found, fallback to largest {...} block
    if (jsonBlocks.length === 0) {
      const curlyMatches = [...text.matchAll(/\{[\s\S]*\}/g)].map(m => m[0]);
      if (curlyMatches.length > 0) {
        const largest = curlyMatches.reduce((a, b) => (a.length > b.length ? a : b));
        return [this.cleanJsonString(largest)];
      }
    }
    if (jsonBlocks.length > 1) {
      const largest = jsonBlocks.reduce((a, b) => (a.length > b.length ? a : b));
      return [largest];
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

    let cleanedJson = jsonString;
    
    try {
      const parsedJson = JSON.parse(cleanedJson);
      const { error, value } = schema.validate(parsedJson);
      if (error) {
        throw new Error(`Validation failed: ${error.details.map(d => d.message).join(', ')}`);
      }
      return value;
    } catch (parseError) {
      if (parseError.message.includes('Invalid JSON format')) {
        try {
          cleanedJson = this.cleanJsonString(jsonString);
          const parsedJson = JSON.parse(cleanedJson);
          const { error, value } = schema.validate(parsedJson);
          if (error) {
            throw new Error(`Validation failed: ${error.details.map(d => d.message).join(', ')}`);
          }
          return value;
        } catch (secondError) {
          throw new Error(`Invalid JSON format after cleaning: ${secondError.message}`);
        }
      } else {
        throw parseError;
      }
    }
  }

  cleanJsonString(jsonString) {
    try {
      let cleaned = jsonString;
      const codeRegex = /"code":\s*"((?:[^"\\]|\\.)*)"/g;
      let match;
      while ((match = codeRegex.exec(jsonString)) !== null) {
        const fullMatch = match[0];
        let codeContent = match[1];
        codeContent = codeContent.replace(/(?<!\\)"/g, '\\"');
        codeContent = codeContent.replace(/\r/g, '\\r').replace(/\n/g, '\\n');
        const newMatch = `"code": "${codeContent}"`;
        cleaned = cleaned.replace(fullMatch, newMatch);
      }
      return cleaned;
    } catch (error) {
      return jsonString;
    }
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
