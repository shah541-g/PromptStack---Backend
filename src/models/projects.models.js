import mongoose from "mongoose";

const projectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'name is required'],
        trim: true,
        maxlength: [50, 'name cannot exceed 50 characters']
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    description: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        default: "pending",
        enum: ['pending', 'completed', 'deployed'],
    },
    deployedURL: {
        type: String
    }
}, {
    timestamps: true
})


export default   mongoose.model('Project', projectSchema);