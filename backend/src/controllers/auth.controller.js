const User = require('../models/User');
const {
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
} = require('../utils/jwt');
const { successResponse, errorResponse } = require('../utils/response');

const saveRefreshToken = async (userId, refreshToken) => {
  await User.updateOne({ _id: userId }, { $push: { refreshTokens: hashToken(refreshToken) } });
};

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
    const accessToken = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    await saveRefreshToken(user._id, refreshToken);

    return successResponse(res, { user, accessToken, refreshToken }, 'Registered successfully', 201);
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

    const accessToken = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    await saveRefreshToken(user._id, refreshToken);

    return successResponse(res, { user, accessToken, refreshToken }, 'Logged in successfully');
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return errorResponse(res, 'Refresh token is required', 400);
    }

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      return errorResponse(res, 'Invalid refresh token', 401);
    }

    const user = await User.findById(payload.id).select('+refreshTokens');
    if (!user) {
      return errorResponse(res, 'User not found', 401);
    }

    const tokenHash = hashToken(refreshToken);
    if (!user.refreshTokens.includes(tokenHash)) {
      return errorResponse(res, 'Invalid refresh token', 401);
    }

    user.refreshTokens = user.refreshTokens.filter((t) => t !== tokenHash);

    const accessToken = generateToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);
    user.refreshTokens.push(hashToken(newRefreshToken));
    await user.save();

    return res.status(200).json({ accessToken, refreshToken: newRefreshToken });
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return errorResponse(res, 'Refresh token is required', 400);
    }

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      return successResponse(res, {}, 'Logged out');
    }

    await User.updateOne(
      { _id: payload.id },
      { $pull: { refreshTokens: hashToken(refreshToken) } }
    );

    return successResponse(res, {}, 'Logged out');
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

module.exports = { register, login, refresh, logout, getMe };