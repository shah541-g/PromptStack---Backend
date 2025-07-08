import projectsModels from "../models/projects.models.js";
import OutputParser from "./outputparser.helper.js";
import Groq from "groq-sdk";
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export const formatInstructionForQroq = `You must respond with a JSON object wrapped in triple backticks that contains exactly two fields:

1. "project_description": A clear, concise description of the project based on the idea whats is core idea of project
2. "requirements": An array of requirement objects, where each object has:
   - "title": A short, descriptive title for the requirement
   - "description": A detailed description of what this requirement entails

Example response format:
\`\`\`json
{
  "project_description": "A comprehensive description of the project based on the idea",
  "requirements": [
    {
      "title": "User Authentication",
      "description": "Implement secure user login and registration system"
    },
    {
      "title": "Content Management",
      "description": "Create system to manage and display project content"
    }
  ]
}
\`\`\`

IMPORTANT: 
- Your response MUST be wrapped in \`\`\`json and \`\`\` code blocks
- Include only "project_description" and "requirements" fields
- Each requirement must have "title" and "description" fields
- Do not include any other fields or schema metadata
- The JSON must be valid and properly formatted`;

export const formatInstructionForBlackbox = `IMPORTANT: The ONLY valid response is a single JSON object wrapped in triple backticks and marked as json, like this: [triple backtick]json ... [triple backtick]. Any other format (including plain code blocks, unmarked triple backticks, or raw JSON) is invalid and will be rejected.\n\nYou are an AI agent that can create, edit, delete, or read code/files based on user requirements and project structure. You must respond with a JSON object wrapped in triple backticks and marked as json that contains exactly three fields:\n\n1. "remarks": A detailed explanation of what you're creating/editing/deleting/reading and why\n2. "success": A boolean. Set to true if you believe all tasks are complete, false otherwise.\n3. "code": An array of code objects, where each object has:\n   - "tool": Must be one of "create", "edit", "delete", or "read" based on the user's request\n   - "path": The file path to create, edit, delete, or read (optional for some tools)\n   - "code": The actual code content (for create/edit), empty string for delete/read, or omitted if not needed\n   - "start": Line number where edit/delete/read starts (use 0 if not applicable)\n   - "end": Line number where edit/delete/read ends (use 0 if not applicable)\n\nIMPORTANT GUIDELINES:\n- Your response MUST be a single JSON object wrapped in triple backticks and marked as json (for example: [triple backtick]json ... [triple backtick]), and must NOT include any other code blocks (such as [triple backtick]tsx, [triple backtick]js, [triple backtick]css, etc.) or raw code. Only the JSON object is allowed.\n- If the user's request does not specify the file or line numbers to edit, respond with a "read" tool request for the relevant file(s) or ask the user for clarification, instead of returning an "edit" tool response.\n- Only use the "edit" tool when you are certain about the file path and the lines to change.\n- If you need more information, you may ask the user a clarifying question in the remarks field and use the "read" tool to request the file content.\n- When you believe all tasks are complete, respond with success: true and an empty code array: "code": []\n- If you cannot proceed and need more information, respond with success: false and an empty code array. The backend will try again and prompt you for clarification"\n  `;

export const generateSrsFromPrompt = (prompt) => {
  return `Convert the following idea into a Software Requirements Specification (SRS) document.
      
Idea: ${prompt}

${formatInstructionForQroq}

CRITICAL: Your response must be a valid JSON object wrapped in \`\`\`json and \`\`\` code blocks with exactly "project_description" and "requirements" fields. No schema definitions, no explanations, no additional text - just the JSON wrapped in code blocks.`;
};

export const generateSrsFromPromptResponse = async (prompts, projectId) => {
  const final = generateSrsFromPrompt(prompts);
  const result = await groq.chat.completions.create({
    "messages": [
      {
        "role": "user",
        "content": final
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
        const validatedData = parser.extractAndValidate(result.choices[0].message.content, PromptOptimzerSchema);
        console.log('Validated data:', validatedData);
        await projectsModels.findByIdAndUpdate(projectId, {
          description: validatedData?.project_description,
          requirments: requirements
        })
      } catch (parseError) {
        console.error('Parsing error:', parseError.message);
        console.log('Raw response:', result.choices[0].message.content);
        
      }
  return result.choices[0].message.content
};

export const streamEngagementMarkdown = async ({ userPrompt, socket, roomId }) => {
  const engagementPrompt = `
You are a friendly AI assistant. The user/agent just said: "${userPrompt}"
Respond with a short, engaging markdown message to acknowledge user request and working or our agent and let them know you are working on it.
Example: "✅ I have found your file and will work on your request. Please wait while I process your prompt."
`;

  const stream = await groq.chat.completions.create({
    messages: [{ role: "user", content: engagementPrompt }],
    model: "llama-3.1-8b-instant",
    temperature: 0.7,
    stream: true,
  });

  let markdown = "";
  for await (const chunk of stream) {
    const content = chunk.choices?.[0]?.delta?.content || "";
    markdown += content;
    if (content) {
      console.log('[AI engagement chunk]', content);
    }
    if (socket && roomId) {
      socket.to(roomId).emit("engagement:markdown", { markdown: content });
      socket.in(roomId).emit("engagement:markdown", { markdown: content });
    }
  }
  if (socket && roomId) {
    socket.to(roomId).emit("engagement:markdown:done", { markdown });
    socket.in(roomId).emit("engagement:markdown:done", { markdown });
  }
  if (markdown) {
    console.log('[AI engagement full response]', markdown);
  }
  return markdown;
};