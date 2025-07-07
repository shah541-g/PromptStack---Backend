import { BlackboxOutputSehema } from "../dtos/blackbox.dto.js";
import Blackbox from "../helpers/blackbox.helper.js";
import OutputParser from "../helpers/outputparser.helper.js";
import { createFilesFromCodeArray, readFileFromGitHub, buildFileReadPrompt, getPromptContext, addPromptToContext } from "../helpers/projects.helper.js";
import { formatInstructionForBlackbox, generateSrsFromPrompt, generateSrsFromPromptResponse, streamEngagementMarkdown } from "../helpers/prompts.helper.js";
import projectsModels from "../models/projects.models.js";
import promptsModels from "../models/prompts.models.js";
import { errorResponse, successResponse } from "../protocols/response.protocols.js";
import pLimit from 'p-limit';

export const testConnection = async (req, res) => {
    try {
        console.log("Testing Blackbox API connection...");
        const model = new Blackbox();
        
        const result = await model.testConnection();
        
        if (result) {
            return successResponse(res, {
                message: "Blackbox API connection successful",
                data: { connected: true }
            });
        } else {
            return errorResponse(res, {
                message: "Blackbox API connection failed",
                statusCode: 503,
                error: "Unable to connect to Blackbox API"
            });
        }
    } catch (error) {
        console.log("Connection test error:", error);
        if (error.response) {
            console.log("Full error response:", error.response);
        }
        return errorResponse(res, {
            message: "Connection test failed",
            statusCode: 503,
            error: error.message
        });
    }
};

export const generate = async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt) {
            return errorResponse(res, {message: "Prompt is required", statusCode: 400});
        }
        const { projectId } = req.params;
        
        
        const githubRepoUrl = `https://github.com/usman-temp/${projectId}.git`;
        const project = await projectsModels.findById(projectId)
        if (!project) {
            return errorResponse(res, {
                message: "Project not found",
                statusCode: 400,
                error: ["Invalud project id"]
            })
        }
        const prompts = await promptsModels
            .find({ project: projectId })
            .sort({ updatedAt: -1 })
            .limit(5)
            .select({ role: 1, content: 1 });
        

        let firstPrompt;

        if (prompts?.length === 0) {
            firstPrompt = await generateSrsFromPromptResponse(prompt);
            await promptsModels.create({
                content: firstPrompt,
                role: "user"
            })
        } else {
            await promptsModels.create({
                content: prompt,
                role: "user"
            });
        }

        await streamEngagementMarkdown({ userPrompt: firstPrompt? firstPrompt :prompt, socket: global.io, roomId: projectId });
        const model = new Blackbox();
        const finalPrompt = `

        BEFORE EDITING FILE FIRST CALL READ TOOL FIRST
        You are coding agent i will give requiremts and etc or simple user prompt you creat the project according to project stucture
        This is file stucture of project and also configure the tailwind css so please tailwind css

        IMPORTANT BEFORE FIRST READ THE FILE  IS COMPULSORY
        
        Write the beautifull compoent based codes using best practices and good quality code and dont create the files that already exist i will provide project stucture this
        if you any external package then edit the package.json also accordingly packkage .json code should be in string mention the start of edit and end

        ##TIP: Read the files first before editing so that you can excat the start and end lines
        MY project is next js whose file structrure is 
    ${project?.stringStucture}




This is the format instructions
${formatInstructionForBlackbox}

User Says:
${firstPrompt? firstPrompt :prompt}
        `

        
        const getReadCode = "GET ALL THE FILES THAT WE WILL NEED FOR THIS PROMPT: " + finalPrompt + " IMPORTANT: ONLY USE THE READ TOOL";
        console.log(getReadCode)
        const readResponse = await model.chat([{ role: "user", content: getReadCode }])
            ;
        console.log("Read response", readResponse)
        const parser = new OutputParser();
        let filesToRead = [];
        try {
            const readParse = parser.extractAndValidate(readResponse.choices[0].message.content, BlackboxOutputSehema);
            filesToRead = (readParse.code || []).filter(c => c.tool === 'read').map(c => c.path);
        } catch (e) {
            console.log("Error parsing read tool response:", e);
        }
        console.log("files to read", filesToRead)
        // STEP 2: Fetch the content of those files from GitHub (parallel with limit and timeout)
        function withTimeout(promise, ms, filePath) {
            return Promise.race([
                promise,
                new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout fetching ${filePath}`)), ms))
            ]);
        }
        const limit = pLimit(5); // max 5 concurrent requests
        const token = process.env.GITHUB_TOKEN || (global.API_KEYS && global.API_KEYS.GITHUB_TOKEN);
        const repoInfo = { owner: "usman-temp", repo: projectId };
        const fileContents = await Promise.all(filesToRead.map(filePath =>
            limit(async () => {
                try {
                    // console.log("Fetching file from GitHub:", filePath);
                    const fileData = await withTimeout(readFileFromGitHub(repoInfo, filePath, token), 10000, filePath);
                    let content = '';
                    if (fileData.encoding === 'base64') {
                        content = Buffer.from(fileData.content, 'base64').toString('utf-8');
                    } else if (fileData.content) {
                        content = fileData.content;
                    } else if (fileData && fileData.content === '') {
                        content = '';
                    } else {
                        content = '[File not found or error reading]';
                    }
                    // console.log("Fetched file:", filePath);
                    return { filePath, content };
                } catch (err) {
                    // console.log("Error fetching file:", filePath, err);
                    if (err && err.response) {
                        console.log("Full error response for file", filePath, ":", err.response);
                    }
                    return { filePath, content: '[File not found or error reading]' };
                }
            })
        ));
        // console.log("hello")
        // STEP 3: Build the context string
        const contextFilesString = fileContents.map(f => `File: ${f.filePath}\n\n${f.content}\n`).join('\n');
        // STEP 4: Prepend this to your finalPrompt
        // console.log("context files", contextFilesString)
        const finalPromptWithContext = `CONTEXT FILES:\n${contextFilesString}\n\n${finalPrompt}`;

        // console.log("final prompt with context", finalPromptWithContext )
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Blackbox operation timed out after 5 minutes')), 30000000);
        });
        const promptArray = prompts.map(p => ({
            role: p.role,
            content: p.content
        }));
        try {
            const response = await Promise.race([
                model.chat([...prompts, { role: "user", content: finalPromptWithContext }]),
                timeoutPromise
            ]);
            const parser = new OutputParser();
            await promptsModels.create({
                content: response.choices[0].message.content,
                role: "agent"
            })
            let parseContent;
            let codeArray;
            let aiResponse = response;
            let loopCount = 0;
            const maxLoops = 10;
            let usedFallbackJson = false;
            let usedNonJsonCodeBlock = false;
            const io = global.io;
            while (loopCount < maxLoops) {
                try {
                    parseContent = parser.extractAndValidate(aiResponse.choices[0].message.content, BlackboxOutputSehema);
                    codeArray = parseContent.code;
                    usedFallbackJson = false;
                    usedNonJsonCodeBlock = false;
                } catch (parseError) {
                    console.log("parseError", parseError)
                    if (parseError.message.includes('No JSON blocks found')) {
                        try {
                            const jsonBlocks = parser.extractJsonBlocks(aiResponse.choices[0].message.content);
                            console.log("json blocks", jsonBlocks)
                            if (jsonBlocks.length > 0) {
                                const codeBlockMatch = aiResponse.choices[0].message.content.match(/```[a-zA-Z]*\s*([\s\S]*?)\s*```/);
                                if (codeBlockMatch && !aiResponse.choices[0].message.content.match(/```json/)) {
                                    usedNonJsonCodeBlock = true;
                                } else {
                                    usedFallbackJson = true;
                                }
                                parseContent = parser.parseAndValidate(jsonBlocks[0], BlackboxOutputSehema);
                                codeArray = parseContent.code;
                                break;
                            }
                        } catch (fallbackError) {
                            const formatErrorPrompt = `Your previous response did not contain a JSON block. Your JSON response should be in triple backticks and marked as json (\`\`\`json). Please respond with a single JSON object wrapped in triple backticks and marked as json as described below. Regenerate your response again in following format\n\n${formatInstructionForBlackbox}`;
                            aiResponse = await model.chat([
                                { role: "user", content: formatErrorPrompt }
                            ]);
                            loopCount++;
                            continue;
                        }
                        const formatErrorPrompt = `Your previous response did not contain a JSON block. Your JSON response should be in triple backticks and marked as json (\`\`\`json). Please respond with a single JSON object wrapped in triple backticks and marked as json as described below. Regenerate your response again in following format\n\n${formatInstructionForBlackbox}`;
                        aiResponse = await model.chat([
                            { role: "user", content: formatErrorPrompt }
                        ]);
                        loopCount++;
                        continue;
                    }
                    const formatErrorPrompt = `Your previous response could not be parsed due to the following error: ${parseError.message}. Please return your response in the correct JSON format as described below. Regenerate your response again in following format\n\n${formatInstructionForBlackbox}`;
                    aiResponse = await model.chat([
                        { role: "user", content: formatErrorPrompt }
                    ]);
                    loopCount++;
                    continue;
                }
                
                const hasRead = codeArray.some(c => c.tool === 'read');
                if (hasRead) {
                    const { aiResponse: nextAIResponse } = await handleReadToolsAndContinue(projectId, codeArray, githubRepoUrl, model, [], io, prompt);
                    aiResponse = nextAIResponse;
                    loopCount++;
                    // continue;
                } 
                    // console.log('Parsed codeArray:', codeArray);
                    console.log('About to call createFilesFromCodeArray with:', { projectId, codeArray, githubRepoUrl, ioExists: !!io });
                    await createFilesFromCodeArray(projectId, codeArray, githubRepoUrl, io);
                    break;
                
            }
            if (usedFallbackJson || usedNonJsonCodeBlock) {
                await model.chat([
                    { role: "user", content: "Your JSON response was not wrapped in triple backticks and marked as json. Please always wrap your JSON in triple backticks and mark as json (```json ... ```)." }
                ]);
            }
            if (loopCount === maxLoops) {
                return errorResponse(res, {
                    message: "Max AI loop count reached. Task may be incomplete.",
                    statusCode: 500
                });
            }
            return successResponse(res, {
                message: "We got ai response",
                data: parseContent
            });
        } catch (error) {
            console.log("Blackbox API error:", error);
            if (error.response) {
                console.log("Full error response:", error.response);
            }
            if (error.message && error.message.includes('500 Internal Server Error')) {
                return errorResponse(res, {
                    message: "The AI service is currently unavailable or encountered an internal error. Please try again later or contact support if the issue persists.",
                    statusCode: 502,
                    error: error.message
                });
            }
            throw error;
        }
    } catch (error) {
        if (error.message.includes('timed out')) {
            return errorResponse(res, {
                message: "Request timed out. The operation took too long to complete.", 
                statusCode: 408, 
                error: error.message
            });
        } else if (error.message.includes('Connection error')) {
            return errorResponse(res, {
                message: "Connection error. Please check your internet connection and try again.", 
                statusCode: 503, 
                error: error.message
            });
        } else {
            return errorResponse(res, {
                message: "Internal Server Error", 
                statusCode: 500, 
                error: error.message
            });
        }
    }
}

export const handleReadToolsAndContinue = async (
  projectId, codeArray, githubRepoUrl, model, contextMessages = [], io, userPrompt
) => {
  try {
    const token = process.env.GITHUB_TOKEN || (global.API_KEYS && global.API_KEYS.GITHUB_TOKEN);
    if (!token) throw new Error('GitHub token not found');
    const readResults = [];
    const notFoundFiles = [];
    for (const codeObj of codeArray) {
      if (codeObj.tool === 'read') {
        try {
          const fileInfo = await readFileFromGitHub(
            githubRepoUrl,
            codeObj.path,
            token,
            codeObj.start,
            codeObj.end,
            io,
            projectId
          );
          readResults.push(fileInfo);
        } catch (err) {
          notFoundFiles.push(codeObj.path);
        }
      }
    }
    if (notFoundFiles.length > 0) {
      const notFoundPrompt = `The following file(s) you requested to read do not exist: ${notFoundFiles.join(", ")}. Please provide the next step or clarify your request.`;
      const nextPrompt = `${notFoundPrompt}\n\nUser request: ${userPrompt}`;
      const aiResponse = await model.chat([
        { role: 'user', content: nextPrompt }
      ]);
      return { aiResponse, readResults };
    }
    // Build a prompt that includes the file content and the original user prompt
    const filesPrompt = readResults.map(
      f => `Here is the content of ${f.filePath}:\n\n${f.content}\n`
    ).join('\n');
    const nextPrompt = `${filesPrompt}\nUser request: ${userPrompt}\n\nNow, based on the above file(s) and the user request, please proceed with the next code generation step.`;
    const aiResponse = await model.chat([
      { role: 'user', content: nextPrompt }
    ]);
      console.log('readPrompt', nextPrompt)
      console.log('aiResponse', aiResponse)
    return { aiResponse, readResults };
  } catch (error) {
    return { aiResponse: { error: error.message }, readResults: [] };
  }
};