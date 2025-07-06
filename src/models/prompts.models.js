import mongoose from "mongoose";

const promptSchema = new mongoose.Schema({
    text: String,
    response: String,
    isFirst: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
})


export default   mongoose.model('Prompt', promptSchema);