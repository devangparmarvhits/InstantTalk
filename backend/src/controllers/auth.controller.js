const User = require('../models/User');
const { generateToken } = require('../utils/jwt');
const { successResponse, errorResponse } = require('../utils/response');

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return errorResponse(res, 'Name, email and password are required', 400);
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return errorResponse(res, 'Email already in use', 400);
    }

    const user = await User.create({ name, email, password });
    const token = generateToken(user._id);

    return successResponse(res, { user, token }, 'Registered successfully', 201);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return errorResponse(res, 'Email and password are required', 400);
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return errorResponse(res, 'Invalid credentials', 401);
    }

    const token = generateToken(user._id);
    return successResponse(res, { user, token }, 'Logged in successfully');
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const getMe = async (req, res) => {
  try {
    return successResponse(res, { user: req.user }, 'User fetched');
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

module.exports = { register, login, getMe };
