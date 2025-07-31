import mongoose from 'mongoose'

const ChatMessageSchema = new mongoose.Schema({
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  message: {
    type: String,
    required: false, // ✅ mark it optional
  },
  fileUrl: {
    type: String,
    required: false,
  },
  fileName: {
    type: String,
    required: false,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
})

// ✅ Enforce: at least one of `message` or `fileUrl` must be present
ChatMessageSchema.pre('validate', function (next) {
  if (!this.message && !this.fileUrl) {
    this.invalidate('message', 'Either message or file must be provided.')
  }
  next()
})

  
const ChatMessage = mongoose.models?.ChatMessage || mongoose.model('ChatMessage', ChatMessageSchema);
export default ChatMessage;
  

