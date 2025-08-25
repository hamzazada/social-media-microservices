const logger = require("../utils/logger");
const {
  validateUserRegistration,
  validatelogin,
} = require("../utils/validation");
const User = require("../models/user");
const generateToken = require("../utils/generateToken");

const registerUser = async (req, res) => {
  console.info("Yes coming here and printing");

  try {
    const { error } = validateUserRegistration(req.body);
    if (error) {
      logger.warn("Validation error", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { username, email, password } = req.body;

    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      logger.warn("User already exists");
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    const newUser = new User({ username, email, password });
    await newUser.save();

    logger.info("User saved successfully", newUser._id);

    const { accesstoken, refreshToken } = await generateToken(newUser);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      accesstoken,
      refreshToken,
    });
  } catch (error) {
    console.log("This is error --", error);
    logger.error("Error registering user", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// User Login

const loginUser = async (req, res) => {
  logger.info("login endpoint hit");
  try {
    const { error } = validatelogin(req.body);
    if (error) {
      logger.warn("Validation error", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      logger.warn("invalid user");
      return res.status(400).json({
        success: false,
        message: "invalid credentials",
      });
    }
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      logger.warn("invalid password");
      return res.status(400).json({
        success: false,
        message: "invalid password",
      });
    }
    const { accesstoken, refreshToken } = await generateToken(user);
    res.json({
      accesstoken,
      refreshToken,
      userID: user._id,
    });
  } catch (error) {
    console.log("This is error --", error);
    logger.error("Error registering user", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
//Refresh Token
const refreshTokenUser = async (req, res) => {
  logger.info("refresh token endpoint hit");
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      logger.warn("refresh Token missing");
      return res.status(400).json({
        success: false,
        message: "refresh Token missing",
      });
    }
    const storedToken = await refreshToken.findOne({ token: refreshToken });
    if (!storedToken || storedToken.expiresAt < new Date()) {
      logger.warn("invalid or expired refresh token");
      return res.status(401).json({
        success: false,
        message: " invalid or expired refresh token",
      });
    }
    const user = await User.findById(storedToken.user);
    if (!user) {
      logger.warn("user not found");
      return res.status(401).json({
        success: false,
        message: "user not found",
      });
    }

    const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
      await generateToken(user);

    // delete the old token
    await RefreshToken.deleteOne({ _id: storedToken._id });
    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    logger.error("refresh token error", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

//Logout
const logoutUser = async (req, res) => {
  logger.info("Logout endpoint hit");

  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      logger.warn("refresh Token missing");
      return res.status(400).json({
        success: false,
        message: "refresh Token missing",
      });
    }
    await RefreshToken.deleteOne({ token: refreshToken });
    logger.info("refresh token deleted for logout");
    res.json({
      success:true,
      message : 'Logout successfully'
    })
  } catch (error) {
    logger.error("error while logging out", error);
    res.status(500).json({
      success: false,
      message: "error while logging out",
    });
  }
};

module.exports = { registerUser, loginUser, refreshTokenUser, logoutUser };
