import mongoose from 'mongoose';

const dataSchema = new mongoose.Schema(
  {
    uid: {
      type: String,
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      enum: ['sleep', 'mood', 'workout', 'meditation'],
      trim: true
    },
    value: {
      type: Number,
      required: true,
      validate: {
        validator(v) {
          if (this.name === 'sleep') return v >= 0 && v <= 24;
          if (this.name === 'mood') return v >= 1 && v <= 5;
          return true;
        },
        message() {
          if (this.name === 'sleep') return 'Sleep hours must be between 0–24';
          if (this.name === 'mood') return 'Mood must be between 1–5';
          return 'Invalid value';
        }
      }
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500
    },
    date: {
      type: Date,
      default: () => new Date(),
      index: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Compound index for faster retrieval and uniqueness
dataSchema.index({ uid: 1, name: 1, date: -1 });
dataSchema.index(
  { uid: 1, name: 1, date: 1 },
  {
    unique: true,
    partialFilterExpression: {
      uid: { $exists: true },
      name: { $exists: true },
      date: { $exists: true }
    }
  }
);

// Static method to fetch filtered entries
dataSchema.statics.findByUser = function (uid, name, { startDate, endDate } = {}) {
  const query = { uid, name };
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }
  return this.find(query).sort({ date: -1 });
};

const Data = mongoose.models.Data || mongoose.model('Data', dataSchema);
export default Data;
