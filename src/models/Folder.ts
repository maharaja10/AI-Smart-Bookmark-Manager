import mongoose, { Document, Schema } from 'mongoose';

export interface IFolder extends Document {
  _id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  userId: mongoose.Types.ObjectId;
  parentId?: mongoose.Types.ObjectId;
  isPublic: boolean;
  publicId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FolderSchema = new Schema<IFolder>({
  name: {
    type: String,
    required: [true, 'Folder name is required'],
    trim: true,
    maxlength: [100, 'Folder name cannot be more than 100 characters'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot be more than 500 characters'],
  },
  color: {
    type: String,
    default: '#3b82f6',
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please enter a valid hex color'],
  },
  icon: {
    type: String,
    default: 'folder',
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  parentId: {
    type: Schema.Types.ObjectId,
    ref: 'Folder',
    default: null,
  },
  isPublic: {
    type: Boolean,
    default: false,
  },
  publicId: {
    type: String,
    unique: true,
    sparse: true,
  },
}, {
  timestamps: true,
});

// Index for better query performance
FolderSchema.index({ userId: 1, name: 1 });

export default mongoose.models.Folder || mongoose.model<IFolder>('Folder', FolderSchema);
