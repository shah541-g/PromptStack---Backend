export const formatInstructionForQroq = `You must respond with a JSON object wrapped in triple backticks that contains exactly two fields:

1. "project_description": A clear, concise description of the project based on the idea
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

