const express = require('express');
const { createGroup, getUserGroups, getGroupInfo, updateGroup } = require('../controllers/group.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/', protect, createGroup);
router.get('/', protect, getUserGroups);
router.get('/:groupId', protect, getGroupInfo);
router.put('/:groupId', protect, updateGroup);

module.exports = router;
