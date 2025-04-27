import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { protect } from '../middlewares/auth.js';
import Sleep from '../models/sleep.js';

const router = express.Router();
router.use(protect);

// GET: Paginated sleep entries
router.get('/', async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const uid = req.user.uid;

  try {
    const sleepData = await Sleep.find({ uid })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ success: true, count: sleepData.length, data: sleepData });
  } catch (err) {
    console.error('Sleep fetch error:', err.message, uid);
    res.status(500).json({ success: false, message: 'Error fetching sleep data' });
  }
});

// POST: Add sleep log
router.post(
  '/',
  [
    body('hours').isFloat({ min: 0, max: 24 }),
    body('quality').isIn(['good', 'average', 'poor'])
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { hours, quality } = req.body;
    const uid = req.user.uid;

    try {
      const newSleep = await Sleep.create({ uid, hours, quality, date: new Date() });

      req.app.get('io')?.emit('sleepUpdate', { action: 'create', data: newSleep });

      res.status(201).json({ success: true, data: newSleep });
    } catch (err) {
      console.error('Sleep creation failed:', err.message, uid);
      res.status(500).json({ success: false, message: 'Could not save sleep data' });
    }
  }
);

// PATCH: Update sleep log
router.patch(
  '/:id',
  [
    param('id').isMongoId(),
    body('hours').optional().isFloat({ min: 0, max: 24 }),
    body('quality').optional().isIn(['good', 'average', 'poor'])
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const uid = req.user.uid;
    const { id } = req.params;

    try {
      const updated = await Sleep.findOneAndUpdate({ _id: id, uid }, req.body, { new: true });

      if (!updated) return res.status(404).json({ success: false, message: 'Sleep entry not found' });

      res.json({ success: true, data: updated });
    } catch (err) {
      console.error('Sleep update failed:', err.message, uid);
      res.status(500).json({ success: false, message: 'Could not update entry' });
    }
  }
);

// DELETE: Remove sleep log
router.delete('/:id', [param('id').isMongoId()], async (req, res) => {
  const uid = req.user.uid;
  const { id } = req.params;

  try {
    const deleted = await Sleep.findOneAndDelete({ _id: id, uid });

    if (!deleted) return res.status(404).json({ success: false, message: 'Sleep entry not found' });

    res.json({ success: true, message: 'Entry deleted' });
  } catch (err) {
    console.error('Sleep delete failed:', err.message, uid);
    res.status(500).json({ success: false, message: 'Could not delete entry' });
  }
});

// GET: Sleep stats (trend + average)
router.get('/stats', async (req, res) => {
  const uid = req.user.uid;
  const { period = 'week' } = req.query;

  const daysMap = { week: 7, month: 30, year: 365 };
  const days = daysMap[period] || 7;
  const from = new Date(Date.now() - days * 86400000);

  try {
    const stats = await Sleep.aggregate([
      { $match: { uid, date: { $gte: from } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          avgHours: { $avg: '$hours' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const average = stats.length
      ? (stats.reduce((sum, e) => sum + e.avgHours, 0) / stats.length).toFixed(2)
      : 0;

    res.json({ success: true, data: { trend: stats, average } });
  } catch (err) {
    console.error('Sleep stats failed:', err.message, uid);
    res.status(500).json({ success: false, message: 'Stats fetch failed' });
  }
});

export default router;
