import mongoose from 'mongoose';

const { Schema } = mongoose;

const AnswerSchema = new Schema(
  {
    questionIndex: { type: Number, required: true, min: 0 },
    selectedIndex: { type: Number, required: true, min: 0 },
    timeTakenSec: { type: Number, required: true, min: 0 },
    correct: { type: Boolean, required: true },
    points: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const QuizAttemptSchema = new Schema(
  {
    quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    answers: { type: [AnswerSchema], default: [] },
    correctCount: { type: Number, default: 0 },
    totalPoints: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// One student may attempt multiple times (up to the limit). We keep all for history.
QuizAttemptSchema.index({ quizId: 1, studentId: 1, createdAt: -1 });

export default mongoose.models.QuizAttempt || mongoose.model('QuizAttempt', QuizAttemptSchema);