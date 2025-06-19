import mongoose from 'mongoose'

const ChatMessageSchema = new mongoose.Schema({
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
})

export default mongoose.models.ChatMessage ||
  mongoose.model('ChatMessage', ChatMessageSchema)
