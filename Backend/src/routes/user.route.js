const express = require('express');
const router = express.Router();


const userController = require('../controllers/user.controllers');

// POST /api/user/login
// router.post('/login', userController.loginUser);
router.post('/login', userController.loginUser);

// POST /api/user/register
router.post('/register', userController.registerUser);

// POST /api/user/add_to_activity
router.post('/add_to_activity', (req, res) => {
  res.send('Add to activity');
});

// GET /api/user/get_all_activity
router.get('/get_all_activity', (req, res) => {
  res.send('Get all activity');
});

module.exports = router;
