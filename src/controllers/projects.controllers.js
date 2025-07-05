import projectsModels from "../models/projects.models";
import { errorResponse } from "../protocols/response.protocols";


const createProject = async (req, res) => {
    try {
         
    } catch (error) {
        return errorResponse(res, {
            statusCode: 500,
            message: "Internal server error"
        })
    }
}