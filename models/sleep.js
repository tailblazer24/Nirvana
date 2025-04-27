import mongoose from 'mongoose';

const sleepSchema = new mongoose.Schema(
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
    hours: {
      type: Number,
      required: true,
      min: [0, 'Sleep hours must be at least 0'],
      max: [24, 'Sleep hours cannot exceed 24']
    },
    quality: {
      type: String,
      required: true,
      enum: {
        values: ['good', 'average', 'poor'],
        message: 'Quality must be one of: good, average, poor'
      }
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Ensure one sleep entry per user per day
sleepSchema.index({ uid: 1, date: 1 }, { unique: true });

// Fetch sleep entries in a date range
sleepSchema.statics.findByDateRange = function (uid, startDate, endDate) {
  return this.find({
    uid,
    date: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  }).sort({ date: -1 });
};

const Sleep = mongoose.models.Sleep || mongoose.model('Sleep', sleepSchema);
export default Sleep;
