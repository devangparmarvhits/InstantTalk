const express = require('express');
const multer = require('multer');
const { getUsers, updateProfile, updateSettings } = require('../controllers/user.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.get('/', protect, getUsers);
router.put('/profile', protect, upload.single('avatar'), updateProfile);
router.put('/settings/:section', protect, updateSettings);

module.exports = router;
