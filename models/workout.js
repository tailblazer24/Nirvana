import mongoose from 'mongoose';

const VALID_TYPES = [
  'cardio', 'strength', 'hiit', 'yoga', 'pilates',
  'cycling', 'running', 'swimming', 'other'
];

const workoutSchema = new mongoose.Schema(
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
        validator: (date) => !isNaN(date.getTime()) && date.getTime() <= Date.now(),
        message: 'Invalid or future date'
      }
    },
    duration: {
      type: Number,
      required: true,
      min: [1, 'Duration must be at least 1 minute'],
      max: [300, 'Duration cannot exceed 300 minutes']
    },
    type: {
      type: String,
      required: true,
      enum: {
        values: VALID_TYPES,
        message: 'Invalid workout type'
      },
      lowercase: true,
      trim: true
    },
    customType: {
      type: String,
      required: function () {
        return this.type === 'other';
      },
      maxlength: 50,
      trim: true
    },
    intensity: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    caloriesBurned: {
      type: Number,
      min: [0, 'Calories cannot be negative']
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500
    },
    exercises: [
      {
        name: { type: String, required: true, trim: true },
        sets: { type: Number, min: 1 },
        reps: { type: Number, min: 1 },
        weight: { type: Number, min: 0 }
      }
    ]
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Prevent duplicate workouts per day + type
workoutSchema.index({ uid: 1, date: 1, type: 1 }, { unique: true });

// Static method to return summary stats
workoutSchema.statics.getSummary = function (uid, period = 'week') {
  const daysMap = { week: 7, month: 30 };
  const days = daysMap[period] || 7;
  const since = new Date(Date.now() - days * 86400000);

  return this.aggregate([
    { $match: { uid, date: { $gte: since } } },
    {
      $group: {
        _id: '$type',
        totalDuration: { $sum: '$duration' },
        sessions: { $sum: 1 },
        avgDuration: { $avg: '$duration' }
      }
    },
    {
      $project: {
        type: '$_id',
        totalDuration: 1,
        sessions: 1,
        avgDuration: { $round: ['$avgDuration', 1] }
      }
    }
  ]);
};

// Instance method for formatted summary
workoutSchema.methods.getFormattedDetails = function () {
  const dateStr = this.date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
  const label = this.displayType;
  return `${dateStr}: ${this.duration}min ${label}`;
};

// Virtual field to display correct name
workoutSchema.virtual('displayType').get(function () {
  return this.type === 'other'
    ? this.customType
    : this.type.charAt(0).toUpperCase() + this.type.slice(1);
});

const Workout = mongoose.models.Workout ||
  mongoose.model('Workout', workoutSchema, 'Workout');

export default Workout;
