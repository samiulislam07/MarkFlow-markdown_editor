import mongoose, { Schema, model, models } from 'mongoose';
import './User';
import './Workspace';


const WorkspaceChatSchema = new Schema({
  workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
  participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
}, );

const WorkspaceChat = models?.WorkspaceChat || model('WorkspaceChat', WorkspaceChatSchema);
export default WorkspaceChat;