import mongoose from 'mongoose';

const ALLOWED_TAGS = ['work', 'family', 'health', 'social', 'hobby'];

const moodSchema = new mongoose.Schema(
  {
    uid: {
      type: String,
      required: true,
      index: true
    },
    date: {
      type: Date,
      default: () => new Date(),
      required: true,
      index: true,
      validate: {
        validator: (date) => date.getTime() <= Date.now(),
        message: 'Date cannot be in the future'
      }
    },
    moodLevel: {
      type: Number,
      required: true,
      min: [1, 'Mood must be at least 1'],
      max: [5, 'Mood cannot exceed 5'],
      validate: {
        validator: Number.isInteger,
        message: 'Mood must be an integer'
      }
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500
    },
    tags: {
      type: [String],
      validate: {
        validator: (arr) => arr.every(tag => ALLOWED_TAGS.includes(tag)),
        message: 'Tags must be one of: ' + ALLOWED_TAGS.join(', ')
      }
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Ensure uniqueness: one mood per day per user
moodSchema.index({ uid: 1, date: 1 }, { unique: true });

// Static: Get moods in a date range
moodSchema.statics.findByDateRange = function (uid, startDate, endDate) {
  return this.find({
    uid,
    date: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  }).sort({ date: -1 });
};

// Instance method: readable mood label
moodSchema.methods.getMoodDescription = function () {
  const map = ['Very Poor', 'Poor', 'Neutral', 'Good', 'Excellent'];
  return map[this.moodLevel - 1] || 'Unknown';
};

// Export model
const Mood = mongoose.models.Mood || mongoose.model('Mood', moodSchema, 'Mood_Tracker');
export default Mood;
