import mongoose from "mongoose";

const promptSchema = new mongoose.Schema({
    content: String,
    role: String,
    isFirst: {
        type: Boolean,
        default: false
    },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Project"
    }
}, {
    timestamps: true
})


export default   mongoose.model('Prompt', promptSchema);