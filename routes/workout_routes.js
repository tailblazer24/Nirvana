import express from 'express';
import { body, validationResult } from 'express-validator';
import { protect } from '../middlewares/auth.js';
import Workout from '../models/workout.js';

const router = express.Router();
router.use(protect);

// GET: Paginated workout logs
router.get('/', async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const uid = req.user.uid;

  try {
    const workouts = await Workout.find({ uid })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({ success: true, count: workouts.length, data: workouts });
  } catch (err) {
    console.error('Workout fetch error:', err.message, uid);
    res.status(500).json({ success: false, message: 'Error fetching workout data' });
  }
});

// POST: Add new workout entry
router.post(
  '/',
  [
    body('type')
      .isIn([
        'cardio', 'strength', 'hiit', 'yoga', 'pilates',
        'cycling', 'running', 'swimming', 'other'
      ])
      .withMessage('Invalid workout type'),

    body('duration')
      .isFloat({ min: 1, max: 300 })
      .withMessage('Duration must be between 1 and 300 minutes'),

    body('intensity')
      .optional()
      .isIn(['low', 'medium', 'high'])
      .withMessage('Invalid intensity level'),

    body('customType')
      .optional()
      .isString()
      .isLength({ max: 50 })
      .withMessage('Custom type must be a string up to 50 characters'),

    body('caloriesBurned')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Calories burned must be a positive number'),

    body('notes')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('Notes cannot exceed 500 characters'),

    body('exercises')
      .optional()
      .isArray()
      .withMessage('Exercises must be an array'),

    body('exercises.*.name')
      .optional()
      .isString()
      .notEmpty()
      .withMessage('Exercise name is required'),

    body('exercises.*.sets')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Sets must be at least 1'),

    body('exercises.*.reps')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Reps must be at least 1'),

    body('exercises.*.weight')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Weight must be a positive number')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      type, duration, intensity = 'medium',
      customType, caloriesBurned, notes, exercises = []
    } = req.body;
    const uid = req.user.uid;

    try {
      const newWorkout = await Workout.create({
        uid,
        type,
        duration,
        intensity,
        customType,
        caloriesBurned,
        notes,
        exercises,
        date: new Date()
      });

      req.app.get('io')?.emit('workoutUpdate', {
        action: 'create',
        data: newWorkout
      });

      res.status(201).json({ success: true, data: newWorkout });
    } catch (err) {
      console.error('Workout creation failed:', err.message, uid);
      res.status(500).json({ success: false, message: 'Could not save workout data' });
    }
  }
);

export default router;
