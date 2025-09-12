import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Rich blog content:
 * - We store TipTap/ProseMirror JSON in "content" (Schema.Types.Mixed).
 * - This supports headings, bold/italic/underline/strike, colors, alignment,
 *   lists, quotes, code, links, images, etc.
 */
const BlogSchema = new Schema(
  {
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true, index: true },

    subject: { type: String, required: true, trim: true, index: true },
    title: { type: String, required: true, trim: true },
    summary: { type: String, default: '' },

    content: { type: Schema.Types.Mixed, required: true }, // TipTap JSON

    published: { type: Boolean, default: true },
  },
  { timestamps: true }
);

BlogSchema.index({ teacherId: 1, classId: 1, subject: 1 });

export default mongoose.models.Blog || mongoose.model('Blog', BlogSchema);