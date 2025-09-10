import mongoose from 'mongoose';

const classSchema = new mongoose.Schema({
  class: { type: Number, required: true, min: 1, max: 12, index: true }, // e.g., 5, 12
  section: { type: String, required: true, trim: true, uppercase: true, index: true } // e.g., 'A', 'C', 'D'
}, { timestamps: true });

classSchema.index({ class: 1, section: 1 }, { unique: true });

classSchema.virtual('label').get(function () {
  return `${this.class} - ${this.section}`;
});

export default mongoose.model('Class', classSchema);