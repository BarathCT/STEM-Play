import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * LeaderboardScore logs every score submission with timestamp.
 * Used to compute Daily (last 24h) and Weekly (last 7d) leaderboards.
 */
const LeaderboardScoreSchema = new Schema(
  {
    type: { type: String, enum: ['quiz', 'game'], required: true, index: true },
    ref: { type: String, required: true, index: true }, // e.g., 'game:circuitsnap', 'game:wordtrail-lv3', 'quiz:<id>'
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    points: { type: Number, required: true, min: 0 },
    meta: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

// For faster window queries
LeaderboardScoreSchema.index({ ref: 1, classId: 1, createdAt: -1 });

export default mongoose.models.LeaderboardScore || mongoose.model('LeaderboardScore', LeaderboardScoreSchema);