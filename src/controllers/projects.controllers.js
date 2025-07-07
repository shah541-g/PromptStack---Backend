import { createGithubRepo,  pushFolderToRepo } from "../helpers/projects.helper.js";
import projectsModels from "../models/projects.models.js";
import { errorResponse, successResponse } from "../protocols/response.protocols.js";
// import app from "../server.js";


export const createProject = async (req, res) => {
    try {
        const { projectName, description } = req.body;
        console.log("Creating project:", { projectName, description });
        

        if (!projectName) {
            return errorResponse(res, {
                message: "Project name is required",
                statusCode: 400
            });
        }

        const project = await projectsModels.create({
            name: projectName,
            description: description,
            status: "pending",
            user: req.user._id
        });

        if (!project) {
            return errorResponse(res, {
                message: "Error in create project object",
                statusCode: 400
            });
        }

        try {
            
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('GitHub operation timed out after 5 minutes')), 300000);
            });

            const githubOperation = async () => {
                const repoData = await createGithubRepo(project._id, {}, description || `# ${projectName}`);
                console.log("GitHub repo created:", repoData.html_url);
                
                await pushFolderToRepo("test-manual", repoData.clone_url);
                
                await projectsModels.findByIdAndUpdate(project._id, { 
                    status: "completed",
                    githubUrl: repoData.html_url
                });
            };

            await Promise.race([githubOperation(), timeoutPromise]);
        } catch (githubError) {
            console.error("Failed to create GitHub repo:", githubError.message);
            
            const status = githubError.message.includes('timeout') ? 'timeout' : 'failed';
            await projectsModels.findByIdAndUpdate(project._id, { 
                status: status,
                error: githubError.message 
            });
            
            return errorResponse(res, {
                statusCode: 500,
                message: githubError.message.includes('timeout') ? 
                    "GitHub operation timed out. Please try again." : 
                    "Failed to create GitHub repository",
                error: githubError.message
            });
        }

        return successResponse(res, {
            message: "Project created successfully",
            statusCode: 201,
            data: project
        });
         
    } catch (error) {
        console.log("Error creating project:", error);
        return errorResponse(res, {
            statusCode: 500,
            message: "Internal server error",
            error: error.message
        });
    }
}

export const getProjectById = async (req, res) => {
    try {
        const { id } = req.params;
        const project = await projectsModels.findOne({_id: id, user: req.user._id});
        if (!project) {
            return errorResponse(res, {
                message: "Project not found",
                statusCode: 404
            });
        }
        return successResponse(res, {
            message: "Project fetched successfully",
            data: project
        });
    } catch (error) {
        return errorResponse(res, {
            statusCode: 500,
            message: "Internal server error",
            error: error.message
        });
    }
};

export const getProjectsByUserId = async (req, res) => {
    try {
        
        const projects = await projectsModels.find({ user: req.user._id });
        return successResponse(res, {
            message: "Projects fetched successfully",
            data: projects
        });
    } catch (error) {
        return errorResponse(res, {
            statusCode: 500,
            message: "Internal server error",
            error: error.message
        });
    }
};

export const deleteProject = async (req, res) => {
    try {
        const { id } = req.params;
        const project = await projectsModels.findOneAndDelete({_id: id, user: req.user._id});
        if (!project) {
            return errorResponse(res, {
                message: "Project not found",
                statusCode: 404
            });
        }
        return successResponse(res, {
            message: "Project deleted successfully",
            data: project
        });
    } catch (error) {
        return errorResponse(res, {
            statusCode: 500,
            message: "Internal server error",
            error: error.message
        });
    }
};