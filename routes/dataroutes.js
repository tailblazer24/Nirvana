import express from 'express';
import Data from '../models/data.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();
router.use(protect);

// GET filtered data for a user + habit type
router.get('/:uid/:type', async (req, res) => {
  try {
    const { uid, type } = req.params;
    const { startDate, endDate } = req.query;

    if (uid !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const data = await Data.findByUser(uid, type, { startDate, endDate });
    res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    console.error('GET /data error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch data' });
  }
});

// POST new entry
router.post('/', async (req, res) => {
  try {
    const { uid, name, value } = req.body;

    if (uid !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const entry = new Data({ uid, name, value, notes: req.body.notes, date: req.body.date });
    const saved = await entry.save();

    req.app.get('io')?.emit('dataUpdate', {
      action: 'create',
      data: saved
    });

    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    console.error('POST /data error:', err);
    res.status(400).json({ success: false, message: err.message || 'Invalid data' });
  }
});

// DELETE entry
router.delete('/:id', async (req, res) => {
  try {
    const entry = await Data.findById(req.params.id);

    if (!entry) {
      return res.status(404).json({ message: 'Data not found' });
    }

    if (entry.uid !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized deletion' });
    }

    await entry.deleteOne();

    req.app.get('io')?.emit('dataUpdate', {
      action: 'delete',
      data: { id: entry._id }
    });

    res.status(200).json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    console.error('DELETE /data error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete data' });
  }
});

export default router;
