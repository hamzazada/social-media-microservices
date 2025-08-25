require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const Redis = require("ioredis");
const cors = require("cors");
const helmet = require("helmet");
const postRoutes = require("./routes/post-routes");
const errorHandler = require("./middleware/errorHandler");
const logger = require("./utils/logger");
const { connectToRabbitMq } = require("./utils/rabbitmq");

const app = express();

const PORT = process.env.PORT || 4001;

//connect to MongoDb
const mongoUri =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  "mongodb://localhost:27017/post-service";
mongoose.connect(mongoUri, {});
const redisClient = new Redis(process.env.REDIS_URL);
// 4. Security & body-parsing middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// 5. Request logger
app.use((req, res, next) => {
  logger.info(`→ ${req.method} ${req.originalUrl}`, { body: req.body });
  next();
});

//routes
app.use(
  "/api/posts",
  (req, res, next) => {
    req.redisClient = redisClient;
    next();
  },
  postRoutes
);

app.use(errorHandler);

async function startServer() {
  try {
    await connectToRabbitMq();
    // 11. Start server
    app.listen(PORT, () => {
      logger.info(`post Server is running on port ${PORT}`);
    });
  } catch (error) {
    logger.info("failed to connect to start server", error);
  }
}
startServer();
 
// 12. Catch unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise}\nReason: ${reason}`);
  // Optionally: process.exit(1);
});
