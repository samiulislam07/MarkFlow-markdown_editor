import mongoose from 'mongoose'

const WorkspaceChatSchema = new mongoose.Schema({
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
})

export default mongoose.models.WorkspaceChat ||
  mongoose.model('WorkspaceChat', WorkspaceChatSchema)
