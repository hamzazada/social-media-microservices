require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const Redis = require("ioredis");
const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const logger = require("./utils/logger");
const proxy = require("express-http-proxy");
const errorHandler = require("./middleware/errorHandler");
const { validateToken } = require("./middleware/auth-middleware");

const redisClient = new Redis(
  process.env.REDIS_URL || "redis://localhost:6379"
);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const ratelimitOptions = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
  handler: (req, res) => {
    logger.warn(`Rate limit hit by IP ${req.ip}`);
    res.status(429).json({
      success: false,
      message: "Too many attempts, please try again later.",
    });
  },
});

app.use(ratelimitOptions);

// Request logging
app.use((req, res, next) => {
  logger.info(`→ ${req.method} ${req.originalUrl}`, { body: req.body });
  next();
});

// Common proxy options
const proxyOptions = {
  proxyReqPathResolver: (req) => {
    return req.originalUrl.replace(/^\/v1/, "/api");
  },
  proxyErrorHandler: (err, res, next) => {
    logger.error(`Proxy error: ${err.message}`);
    if (res && res.status) {
      return res.status(500).json({
        message: "Internal server error",
        error: err.message,
      });
    }
    next(err);
  },
  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
    proxyReqOpts.headers["content-type"] = "application/json";
    return proxyReqOpts;
  },
  userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
    logger.info(`Response received from service: ${proxyRes.statusCode}`);
    return proxyResData;
  },
};

// Setting up proxy for identity service
app.use(
  "/v1/auth/",
  proxy(process.env.IDENTITY_SERVICE_URL, {
    ...proxyOptions,
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response received from identity service: ${proxyRes.statusCode}`
      );
      return proxyResData;
    },
  })
);

// Setting up proxy for post service
app.use(
  "/v1/posts",
  validateToken,
  proxy(process.env.POST_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["content-type"] = "application/json";
      proxyReqOpts.headers["x-user-id"] = srcReq.user.userId;
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response received from post service: ${proxyRes.statusCode}`
      );
      return proxyResData;
    },
  })
);
// Setting up proxy for media service
app.use(
  "/v1/media",
  validateToken,
  proxy(process.env.MEDIA_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["x-user-id"] = srcReq.user.userId;
      if (!srcReq.headers["content-type"].startsWith("multipart/form-data")) {
        proxyReqOpts.headers["content-type"] = "application/json";
      }
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response received from media service: ${proxyRes.statusCode}`
      );
      return proxyResData;
    },
    parseReqBody: false,
  })
);
// Setting up proxy for search service
app.use(
  "/v1/search",
  validateToken,
  proxy(process.env.SEARCH_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["content-type"] = "application/json";
      proxyReqOpts.headers["x-user-id"] = srcReq.user.userId;
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response received from search service: ${proxyRes.statusCode}`
      );
      return proxyResData;
    },
  })
);
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`API Gateway is running on port ${PORT}`);
  logger.info(
    `Identity service URL: ${process.env.IDENTITY_SERVICE_URL || "Not set"}`
  );
  logger.info(`Post service URL: ${process.env.POST_SERVICE_URL || "Not set"}`);
  logger.info(
    `Media service URL: ${process.env.MEDIA_SERVICE_URL || "Not set"}`
  );
  logger.info(
    `Search service URL: ${process.env.SEARCH_SERVICE_URL || "Not set"}`
  );
  logger.info(
    `Redis URL: ${process.env.REDIS_URL || "redis://localhost:6379"}`
  );
});
