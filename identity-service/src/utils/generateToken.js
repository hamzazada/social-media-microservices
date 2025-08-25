const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const RefreshToken = require("../models/refreshToken");
const generateToken = async (User) => {
  const accesstoken = jwt.sign(
    {
      userId: User._id,
      username: User.username,
    },
    process.env.JWT_SECRET_KEY,
    { expiresIn: "1h" }
  );
  const refreshToken = crypto.randomBytes(40).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await RefreshToken.create({
    token: refreshToken,
    user: User._id,
    expiresAt,
  });
  return { accesstoken, refreshToken };
};
module.exports = generateToken;
