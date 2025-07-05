import { Groq } from 'groq-sdk';



export const promptToSrs = async (req, res) => {
    
    try {
        const groq = new Groq({
          apiKey: process.env.GROQ_API_KEY,
        });
       const prompt = req.body.prompt;
       let finalPrompt = `
      I will provide a feature idea, app concept, or product description. Convert it into a clear and structured Software Requirements Specification (SRS) document.
      
      Idea: ${prompt}`
    const chatCompletion = await groq.chat.completions.create({
        "messages": [
          {
            "role": "user",
            "content": finalPrompt
          }
        ],
        "model": "llama-3.1-8b-instant",
        "temperature": 1,
        "max_completion_tokens": 1024,
        "top_p": 1,
        "stream": false,
        "stop": null
      });
      
      console.log(chatCompletion.choices[0].message.content);
      return res.json(chatCompletion.choices[0].message.content);
   } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error creating project' });
   }


}