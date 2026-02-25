const express = require('express');
const router = express.Router();


const userController = require('../controllers/user.controllers');

// POST /api/user/login
// router.post('/login', userController.loginUser);
router.post('/login', userController.loginUser);

// POST /api/user/register
router.post('/register', userController.registerUser);

// POST /api/user/logout
router.post('/logout', userController.logoutUser);

// POST http://localhost:3000/api/v1/users/addactivity
router.post('/addactivity', userController.addUserHistory);

// GET http://localhost:3000/api/v1/users/getactivity
router.get('/getactivity', userController.getUserHistory);

module.exports = router;
