import { BlackboxOutputSehema } from "../dtos/blackbox.dto.js";
import Blackbox from "../helpers/blackbox.helper.js";
import OutputParser from "../helpers/outputparser.helper.js";
import { createFilesFromCodeArray, readFileFromGitHub, buildFileReadPrompt, getPromptContext, addPromptToContext } from "../helpers/projects.helper.js";
import { formatInstructionForBlackbox } from "../helpers/prompts.helper.js";
import projectsModels from "../models/projects.models.js";
import promptsModels from "../models/prompts.models.js";
import { errorResponse, successResponse } from "../protocols/response.protocols.js";

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
        console.log("projectid", projectId)
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
        await promptsModels.create({
            content: prompt,
            role: "user"
        });

        const model = new Blackbox();
        console.log("Blackbox model initialized");
        const finalPrompt = `
        This is file stucture of project and also configure the tailwind css so please tailwind css
        
        Write the beautifull compoent based codes using best practices and good quality code and dont create the files that already exist i will provide project stucture this
        if you any external package then edit the package.json also accordingly packkage .json code should be in string mention the start of edit and end

        ##TIP: Read the files first before editing so that you can excat the start and end lines

        
    ${project?.stringStucture}
This is the User Prompt
${prompt}

This is the format instructions
${formatInstructionForBlackbox}
        `

        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Blackbox operation timed out after 5 minutes')), 3000000);
        });

        console.log("Sending request to Blackbox API...");
        
        const promptArray = prompts.map(p => ({
            role: p.role,
            content: p.content
        }));

        try {
            const response = await Promise.race([
                model.chat([...prompts, { role: "user", content: finalPrompt }]),
                timeoutPromise
            ]);

            const parser = new OutputParser();
            console.log("response.choices[0].message.content", response.choices[0].message.content)
            await promptsModels.create({
                content: response.choices[0].message.content,
                role: "agent"
            })
console.log("projectid", projectId)
            let parseContent;
            let codeArray;
            let aiResponse = response;
            let loopCount = 0;
            const maxLoops = 10;
            let usedFallbackJson = false;
            let usedNonJsonCodeBlock = false;
            while (loopCount < maxLoops) {
                try {
                    parseContent = parser.extractAndValidate(aiResponse.choices[0].message.content, BlackboxOutputSehema);
                    codeArray = parseContent.code;
                    usedFallbackJson = false;
                    usedNonJsonCodeBlock = false;
                } catch (parseError) {
                    console.log("Parse error:", parseError.message);
                    if (parseError.message.includes('No JSON blocks found')) {
                        // Try fallback: attempt to parse largest {...} block or any code block
                        try {
                            const jsonBlocks = parser.extractJsonBlocks(aiResponse.choices[0].message.content);
                            if (jsonBlocks.length > 0) {
                                // Check if the block was in a code block but not marked as json
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
                            // If fallback fails, prompt AI for correct format
                            const formatErrorPrompt = `Your previous response did not contain a JSON block. Your JSON response should be in triple backticks and marked as json (\`\`\`json). Please respond with a single JSON object wrapped in triple backticks and marked as json as described below.\n\n${formatInstructionForBlackbox}`;
                            aiResponse = await model.chat([
                                { role: "user", content: formatErrorPrompt }
                            ]);
                            print("error", aiResponse)
                            loopCount++;
                            continue;
                        }
                        const formatErrorPrompt = `Your previous response did not contain a JSON block. Your JSON response should be in triple backticks and marked as json (\`\`\`json). Please respond with a single JSON object wrapped in triple backticks and marked as json as described below.\n\n${formatInstructionForBlackbox}`;
                        aiResponse = await model.chat([
                            { role: "user", content: formatErrorPrompt }
                        ]);
                        loopCount++;
                        continue;
                    }
                    const formatErrorPrompt = `Your previous response could not be parsed due to the following error: ${parseError.message}. Please return your response in the correct JSON format as described below.\n\n${formatInstructionForBlackbox}`;
                    aiResponse = await model.chat([
                        { role: "user", content: formatErrorPrompt }
                    ]);
                    loopCount++;
                    continue;
                }
                if (parseContent.success === false) {
                    loopCount++;
                    aiResponse = await model.chat([
                        { role: "user", content: "Your previous response indicated success: false. Please try again and complete the task or clarify what is needed." }
                    ]);
                    continue;
                }
                const hasRead = codeArray.some(c => c.tool === 'read');
                if (hasRead) {
                    const { aiResponse: nextAIResponse } = await handleReadToolsAndContinue(projectId, codeArray, githubRepoUrl, model);
                    aiResponse = nextAIResponse;
                    loopCount++;
                    continue;
                } else {
                    await createFilesFromCodeArray(projectId, codeArray, githubRepoUrl);
                    break;
                }
            }
            if (usedFallbackJson || usedNonJsonCodeBlock) {
                // Enforce format for next time
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
            if (error.message && error.message.includes('500 Internal Server Error')) {
                console.error('Blackbox API 500 error. Prompt array:', JSON.stringify(promptArray, null, 2));
                console.error('Final prompt:', finalPrompt);
                return errorResponse(res, {
                    message: "The AI service is currently unavailable or encountered an internal error. Please try again later or contact support if the issue persists.",
                    statusCode: 502,
                    error: error.message
                });
            }
            throw error;
        }
        
    } catch (error) {
        console.log("Error in agent generation:", error);
        
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

export const handleReadToolsAndContinue = async (projectId, codeArray, githubRepoUrl, model, contextMessages = []) => {
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
                    codeObj.end
                );
                readResults.push(fileInfo);
            } catch (err) {
                notFoundFiles.push(codeObj.path);
            }
        }
    }
    if (notFoundFiles.length > 0) {
        const notFoundPrompt = `The following file(s) you requested to read do not exist: ${notFoundFiles.join(", ")}. Please provide the next step or clarify your request. If you foundd any errors in this please fix them also`;
        const context = contextMessages.length ? contextMessages : getPromptContext();
        const contextText = context.map(m => `${m.role}: ${m.content}`).join('\n\n');
        const nextPrompt = `${notFoundPrompt}\n\nRecent conversation:\n${contextText}`;
        addPromptToContext('user', nextPrompt);
        const aiResponse = await model.chat([
            ...context.slice(-4).map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: nextPrompt }
        ]);
        addPromptToContext('agent', aiResponse.choices?.[0]?.message?.content || '');
        return { aiResponse, readResults };
    }
    const filesPrompt = readResults.map(buildFileReadPrompt).join('\n\n');
    const context = contextMessages.length ? contextMessages : getPromptContext();
    const contextText = context.map(m => `${m.role}: ${m.content}`).join('\n\n');
    const nextPrompt = `Here are the files you requested to read:\n\n${filesPrompt}\n\nContinue with the next code generation step based on this context.\n\nRecent conversation:\n${contextText}`;
    addPromptToContext('user', nextPrompt);
    const aiResponse = await model.chat(
        [
            ...context.slice(-4).map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: nextPrompt }
        ]
    );
    addPromptToContext('agent', aiResponse.choices?.[0]?.message?.content || '');
    return { aiResponse, readResults };
};