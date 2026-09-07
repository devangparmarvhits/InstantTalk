const express = require('express');
const { getCallHistory, createCallRecord, createGroupCallRecord, deleteCall, clearCallHistory } = require('../controllers/call.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/', protect, getCallHistory);
router.post('/', protect, createCallRecord);
router.post('/group', protect, createGroupCallRecord);
router.delete('/history', protect, clearCallHistory);
router.delete('/:callId', protect, deleteCall);

module.exports = router;
