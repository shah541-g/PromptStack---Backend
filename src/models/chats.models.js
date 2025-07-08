import mongoose from "mongoose";

const AgentChatSchema = new mongoose.Schema({
    question: { type: String, required: true },
    answer: { type: String },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'projects', required: true },
  }, { timestamps: true });
  
  const AgentChat = mongoose.model('AgentChat', AgentChatSchema);
  
export default AgentChat;