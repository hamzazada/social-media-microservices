const logger = require("../utils/logger");
const jwt = require("jsonwebtoken");

const validateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];

  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    logger.warn("Access attempt without valid token!");
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }
  console.info(process.env.JWT_SECRET_KEY);
  jwt.verify(token, process.env.JWT_SECRET_KEY, (err, user) => {
    if (err) {
      logger.warn("Invalid token!");
      return res.status(429).json({
        success: false,
        message: "Invalid token!",
      });
    }
    req.user = user;
    next();
  });
};
module.exports = { validateToken };
