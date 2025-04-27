import express from 'express';
import Mood from '../models/mood.js';
import { validateRequest } from '../middlewares/validation.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();
router.use(protect);

const TAGS_ENUM = ['work', 'family', 'health', 'social', 'hobby'];

// POST: Create mood entry
router.post(
  '/',
  validateRequest({
    date: { type: 'date', required: true, maxDate: new Date() },
    moodLevel: { type: 'number', required: true, min: 1, max: 5 },
    notes: { type: 'string', maxLength: 500 },
    tags: { type: 'array', items: { type: 'string', enum: TAGS_ENUM } }
  }),
  async (req, res) => {
    const uid = req.user.uid;
    const { date, moodLevel, notes, tags } = req.body;

    try {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);

      const exists = await Mood.findOne({ uid, date: { $gte: start, $lte: end } });
      if (exists) {
        return res.status(409).json({ success: false, message: 'Mood already logged for this date' });
      }

      const mood = await Mood.create({ uid, date, moodLevel, notes, tags });
      req.app.get('io')?.emit('moodUpdate', { action: 'create', data: mood });

      res.status(201).json({ success: true, data: mood, message: 'Mood saved' });
    } catch (err) {
      console.error('Mood creation failed:', err);
      res.status(500).json({ success: false, message: 'Could not save mood entry' });
    }
  }
);

// GET: Paginated mood fetch
router.get('/', async (req, res) => {
  const uid = req.user.uid;
  const { startDate, endDate, page = 1, limit = 30 } = req.query;
  const query = { uid };

  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }

  try {
    const moods = await Mood.find(query)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ success: true, count: moods.length, data: moods });
  } catch (err) {
    console.error('Fetch moods failed:', err);
    res.status(500).json({ success: false, message: 'Error fetching mood entries' });
  }
});

// GET: Stats (average + trend)
router.get('/stats', async (req, res) => {
  const uid = req.user.uid;
  const { period = 'week' } = req.query;

  const dayMap = { week: 7, month: 30, year: 365 };
  const days = dayMap[period] || 7;
  const since = new Date(Date.now() - days * 86400000);

  try {
    const stats = await Mood.aggregate([
      { $match: { uid, date: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          avg: { $avg: '$moodLevel' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const average = stats.length
      ? (stats.reduce((acc, cur) => acc + cur.avg, 0) / stats.length).toFixed(2)
      : 0;

    const count = stats.reduce((acc, cur) => acc + cur.count, 0);

    res.json({ success: true, data: { average, count, trend: stats } });
  } catch (err) {
    console.error('Mood stats failed:', err);
    res.status(500).json({ success: false, message: 'Stats calculation failed' });
  }
});

// PUT: Update mood
router.put(
  '/:id',
  validateRequest({
    moodLevel: { type: 'number', min: 1, max: 5 },
    notes: { type: 'string', maxLength: 500 },
    tags: { type: 'array', items: { type: 'string', enum: TAGS_ENUM } }
  }),
  async (req, res) => {
    const uid = req.user.uid;
    const { id } = req.params;
    const update = req.body;

    try {
      const updated = await Mood.findOneAndUpdate({ _id: id, uid }, { $set: update }, { new: true });

      if (!updated) {
        return res.status(404).json({ success: false, message: 'Mood entry not found' });
      }

      req.app.get('io')?.emit('moodUpdate', { action: 'update', data: updated });

      res.json({ success: true, message: 'Mood updated', data: updated });
    } catch (err) {
      console.error('Mood update failed:', err);
      res.status(500).json({ success: false, message: 'Error updating mood entry' });
    }
  }
);

// DELETE
router.delete('/:id', async (req, res) => {
  const uid = req.user.uid;
  const { id } = req.params;

  try {
    const deleted = await Mood.findOneAndDelete({ _id: id, uid });

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Mood entry not found' });
    }

    req.app.get('io')?.emit('moodUpdate', { action: 'delete', data: { id } });

    res.json({ success: true, message: 'Mood deleted successfully' });
  } catch (err) {
    console.error('Mood delete failed:', err);
    res.status(500).json({ success: false, message: 'Error deleting mood entry' });
  }
});

export default router;
