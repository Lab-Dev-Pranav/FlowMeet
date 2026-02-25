const httpStatus = require('http-status');

const { User } = require('../models/user.model');
const { Meeting } = require('../models/meeting.model');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

module.exports.loginUser = async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res
        .status(404)
        .json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {

      const token = crypto.randomBytes(32).toString('hex');
      user.token = token;
      await user.save();

      const safeUser = {
        id: user._id,
        name: user.name,
        username: user.username,
      };

      return res
        .status(200)
        .json({ message: 'Login successful', token, user: safeUser });

    } else {
      return res
        .status(401)
        .json({ message: 'Invalid credentials' });
    }



  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: 'Server error at Login route' });
  }
};

module.exports.registerUser = async (req, res) => {
  const { name, username, password } = req.body;

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, username, password: hashedPassword });

    await newUser.save();

    return res
      .status(200)
      .json({ message: 'User registered successfully' });

  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: 'Server error at Register route' });
  }
};

module.exports.logoutUser = async (req, res) => {
  const { token } = req.body;

  try {
    const user = await User.findOne({ token });
    if (!user) {
      return res
        .status(404)
        .json({ message: 'User not found' });
    }
    user.token = null;
    await user.save();
    return res
      .status(200)
      .json({ message: 'Logout successful' });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: 'Server error at Logout route' });
  }
};

module.exports.getUserHistory = async (req, res) => {
  const token = req.query.token || req.body?.token;
  try {
    if (!token) {
      return res
        .status(400)
        .json({ message: 'Token is required' });
    }

    const user = await User.findOne({ token });
    if (!user) {
      return res
        .status(404)
        .json({ message: 'User not found' });
    }

    const mettings = await Meeting.find({ user_id: user._id });
    return res
      .status(200)
      .json(mettings);

  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: `Server error at getUserHistory route - ${err}}` });
  }


}

module.exports.addUserHistory = async (req, res) => {
  const token = req.body?.token;
  const meetingCode = req.body?.meetingCode || req.body?.mettingCode || req.body?.mettingcode;

  try {
    if (!token || !meetingCode) {
      return res
        .status(400)
        .json({ message: 'Token and meeting code are required' });
    }

    const user = await User.findOne({ token });
    if (!user) {
      return res
        .status(404)
        .json({ message: 'User not found' });
    }

    const newMetting = new Meeting({
      user_id: user._id,
      meeting_code: meetingCode
    });

    await newMetting.save();
    return res
      .status(201)
      .json({ message: 'Added meeting code to history' });

  } catch (err) {
    console.error(err);
    if (err && err.code === 11000) {
      return res
        .status(409)
        .json({ message: 'Meeting code already exists in history' });
    }
    return res
      .status(500)
      .json({ message: `Server error at addUserHistory route - ${err}}` });
  }

}
