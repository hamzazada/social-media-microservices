require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const logger = require('./utils/logger');
const cors = require('cors');
const helmet = require('helmet');
const { RateLimiterRedis } = require('rate-limiter-flexible');
const Redis = require('ioredis');
const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');

const routes = require('./routes/identity-service');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 4000;

// 1. Boot log
console.log('🚀 Bootstrapping application…');

// 2. MongoDB connection
mongoose
  .connect(process.env.MONGO_URI, {})
  .then(() => logger.info('Connected to MongoDB'))
  .catch((err) => {
    logger.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  });

// 3. Redis connection
const redisClient = new Redis(process.env.REDIS_URL);
redisClient.on('connect', () => logger.info('Connected to Redis'));
redisClient.on('error', (err) => {
  logger.error('Redis error:', err);
  process.exit(1);
});

// 4. Security & body-parsing middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// 5. Request logger
app.use((req, res, next) => {
  logger.info(`→ ${req.method} ${req.originalUrl}`, { body: req.body });
  next();
});

// 6. Global rate limiter (DDOS protection)
const globalLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'rl_global',
  points: 10,    // 10 requests 
  duration: 1,   // per second
});
app.use((req, res, next) => {
  globalLimiter
    .consume(req.ip)
    .then(() => next())
    .catch(() => {
      logger.warn(`Global rate limit exceeded for IP ${req.ip}`);
      res.status(429).json({
        success: false,
        message: 'Too many requests, please try again later.',
      });
    });
});

// 7. Sensitive-route limiter (e.g. registration)
const sensitiveLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minutes
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
  handler: (req, res) => {
    logger.warn(`Sensitive rate limit hit by IP ${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Too many attempts to sensitive route, please try again later.',
    });
  },
});
app.use('/api/auth/register', sensitiveLimiter);

// 8. Mount your auth routes
app.use('/api/auth', routes);

// 9. Health-check / root handler
app.get('/', (req, res) => {
  res.status(200).json({ message: 'API is running fine' });
});

// 10. Centralized error handler (must come after all routes)
app.use(errorHandler);

// 11. Start server
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});

// 12. Catch unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise}\nReason: ${reason}`);
  // Optionally: process.exit(1);
});