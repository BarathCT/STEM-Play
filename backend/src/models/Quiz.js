import mongoose from 'mongoose';

const { Schema } = mongoose;

const QuestionSchema = new Schema(
  {
    text: { type: String, required: true },
    options: { type: [String], validate: v => Array.isArray(v) && v.length >= 2 },
    correctIndex: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const QuizSchema = new Schema(
  {
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true, index: true },

    title: { type: String, required: true, trim: true },
    sourceBlogId: { type: Schema.Types.ObjectId, ref: 'Blog', default: null },

    // Full questions (stored server-side; student fetch will not include correctIndex)
    questions: { type: [QuestionSchema], required: true },

    // Settings
    perQuestionSeconds: { type: Number, default: 30, min: 5, max: 600 },
    maxAttemptsPerStudent: { type: Number, default: 1, min: 1, max: 10 },
    published: { type: Boolean, default: true },
  },
  { timestamps: true }
);

QuizSchema.index({ teacherId: 1, classId: 1, createdAt: -1 });

export default mongoose.models.Quiz || mongoose.model('Quiz', QuizSchema);