const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const {
  getActiveStreams,
  getStream,
  createStream,
  endStream,
  getMyActiveStream,
  getRecentStreams,
} = require('../controllers/stream.controller');

const router = express.Router();

router.get('/active', protect, getActiveStreams);
router.get('/recent', protect, getRecentStreams);
router.get('/me', protect, getMyActiveStream);
router.get('/:streamId', protect, getStream);
router.post('/', protect, createStream);
router.post('/:streamId/end', protect, endStream);

module.exports = router;
