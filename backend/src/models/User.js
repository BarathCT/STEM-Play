import mongoose from 'mongoose';

const { Schema } = mongoose;

const UserSchema = new Schema(
  {
    name: { type: String, trim: true, required: true },

    // For admin/teacher login
    email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true, // allow multiple docs without email
      index: true,
    },

    // For student login (parent logs in with this)
    parentEmail: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
    },

    passwordHash: { type: String },

    role: {
      type: String,
      enum: ['admin', 'teacher', 'student'],
      required: true,
      index: true,
    },

    // Optional IDs
    staffId: {
      type: String,
      trim: true,
      unique: true,
      sparse: true, // optional but must be unique if present
      index: true,
    },
    registerId: {
      type: String,
      trim: true,
      unique: true,
      sparse: true, // optional but must be unique if present
      index: true,
    },

    // Class relations
    classIds: [{ type: Schema.Types.ObjectId, ref: 'Class' }],

    // Convenience pointers
    assignedTeacherId: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedClassId: { type: Schema.Types.ObjectId, ref: 'Class' },
  },
  { timestamps: true }
);

// Helpful composite indexes
UserSchema.index({ role: 1, email: 1 });
UserSchema.index({ role: 1, parentEmail: 1 });

export default mongoose.models.User || mongoose.model('User', UserSchema);