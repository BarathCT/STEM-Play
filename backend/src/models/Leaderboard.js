import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * LeaderboardEntry keeps a single best score per student for a given item.
 * - type: 'quiz' | 'game'
 * - ref:  'quiz:<quizId>' or 'game:<slug>' (optionally with level suffix, e.g., 'game:wordtrail-lv3')
 * - classId: class scope for the student at time of score
 * - teacherId: convenience pointer (student's assigned teacher) for scoping lists
 * - bestPoints: higher is better
 * - bestMeta: optional object storing additional details (e.g., correctCount, total, time, level)
 */
const LeaderboardSchema = new Schema(
  {
    type: { type: String, enum: ['quiz', 'game'], required: true, index: true },
    ref: { type: String, required: true, index: true }, // e.g., 'quiz:6531abc...', 'game:circuitsnap'
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    bestPoints: { type: Number, required: true, min: 0 },
    bestMeta: { type: Schema.Types.Mixed, default: null },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// one best entry per (ref, student)
LeaderboardSchema.index({ ref: 1, studentId: 1 }, { unique: true });

export default mongoose.models.Leaderboard || mongoose.model('Leaderboard', LeaderboardSchema);