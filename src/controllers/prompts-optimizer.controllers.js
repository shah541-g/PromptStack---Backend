import { Groq } from 'groq-sdk';
import OutputParser from '../helpers/outputparser.helper.js';
import { formatInstructionForQroq } from '../helpers/prompts.helper.js';
import { PromptOptimzerSchema } from '../dtos/prompt-optimizer-schema.dto.js';



export const promptToSrs = async (req, res) => {
    
    try {
        const groq = new Groq({
          apiKey: process.env.GROQ_API_KEY,
        });
       const prompt = req.body.prompt;
       let finalPrompt = `
      Convert the following idea into a Software Requirements Specification (SRS) document.
      
      Idea: ${prompt}
      
      ${formatInstructionForQroq}
      
      CRITICAL: Your response must be a valid JSON object wrapped in \`\`\`json and \`\`\` code blocks with exactly "project_description" and "requirements" fields. No schema definitions, no explanations, no additional text - just the JSON wrapped in code blocks.
      `
    const chatCompletion = await groq.chat.completions.create({
        "messages": [
          {
            "role": "user",
            "content": finalPrompt
          }
        ],
        "model": "llama-3.1-8b-instant",
        "temperature": 1,
        // "max_completion_tokens": 1024,
        "top_p": 1,
        "stream": false,
        "stop": null
    });
      const parser = new OutputParser()
      
      try {
        const validatedData = parser.extractAndValidate(chatCompletion.choices[0].message.content, PromptOptimzerSchema);
        console.log('Validated data:', validatedData);
        return res.json({
          success: true,
          data: validatedData,
          message: 'SRS generated successfully'
        });
      } catch (parseError) {
        console.error('Parsing error:', parseError.message);
        console.log('Raw response:', chatCompletion.choices[0].message.content);
        return res.json({
          success: false,
          error: 'Failed to parse AI response as JSON',
          rawResponse: chatCompletion.choices[0].message.content,
          parseError: parseError.message
        });
      }
   } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error creating project' });
   }


}