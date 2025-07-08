import Joi from 'joi';

export default class OutputParser {
  constructor() {
    // Prefer triple backtick with json, then any triple backtick, then any code block, then plain JSON
    // Allow optional newline or whitespace after the opening backticks
    this.jsonBlockRegex = /```json\s*\n?([\s\S]*?)\s*```/g;
    this.anyTripleBacktickRegex = /```[a-zA-Z]*\s*\n?([\s\S]*?)\s*```/g;
    this.anyCodeBlockRegex = /`{3,}|'{3,}|~{3,}|\[{3,}|\({3,}|\{{3,}\s*\n?([\s\S]*?)[`'~\[\(\{]{3,}/g;
  }

  extractJsonBlocks(content) {
    // Extract all JSON blocks wrapped in triple backticks and marked as json
    const matches = [...content.matchAll(/```json[\s\S]*?({[\s\S]*?})[\s\S]*?```/g)];
    return matches.map(m => m[1]);
  }

  parseAndValidate(jsonString, schema) {
    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (e) {
      throw new Error('Invalid JSON: ' + e.message);
    }
    // Optionally validate with schema here if needed
    if (schema) {
      // You can add schema validation here if you want
    }
    return parsed;
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

  extractAndValidate(content, schema) {
    // Try to extract a JSON block wrapped in triple backticks and marked as json
    const jsonBlockMatch = content.match(/```json([\s\S]*?)```/);
    let jsonString = null;
    if (jsonBlockMatch && jsonBlockMatch[1]) {
      // Remove any lines before the first '{'
      const lines = jsonBlockMatch[1].split('\n');
      const firstBraceIndex = lines.findIndex(line => line.trim().startsWith('{'));
      if (firstBraceIndex !== -1) {
        jsonString = lines.slice(firstBraceIndex).join('\n');
      } else {
        jsonString = jsonBlockMatch[1];
      }
    } else {
      // Fallback: try to find the first {...} block in the content
      const curlyMatch = content.match(/({[\s\S]*})/);
      if (curlyMatch && curlyMatch[1]) {
        jsonString = curlyMatch[1];
      }
    }
    if (!jsonString) {
      throw new Error('No JSON blocks found');
    }
    jsonString = jsonString.trim();
    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (e) {
      throw new Error('Invalid JSON: ' + e.message + '\n\nJSON String:\n' + jsonString);
    }
    // Optionally validate with schema here if needed
    if (schema) {
      // You can add schema validation here if you want
    }
    return parsed;
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
