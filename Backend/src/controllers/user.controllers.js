const httpStatus = require('http-status');

const { User } = require('../models/user.model');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

module.exports.loginUser = async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res
        .status(404  )
        .json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {

       const token = crypto.randomBytes(32).toString('hex');
    user.token = token;
    await user.save();

    return res
      .status(200)
      .json({ message: 'Login successful', token });
     
    }else{
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
        .status(409)
        .json({ message: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, username, password: hashedPassword });

    await newUser.save();

    return res
      .status(httpStatus.CREATED)
      .json({ message: 'User registered successfully' });

  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: 'Server error at Register route' });
  }
};
