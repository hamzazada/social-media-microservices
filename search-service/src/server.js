require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const Redis = require("ioredis");
const cors = require("cors");
const helmet = require("helmet");
const errorHandler = require("./middleware/errorHandler");
const logger = require("./utils/logger");
const { connectToRabbitMq, consumeEvent } = require("./utils/rabbitmq");
const searchRoutes = require("./routes/search-routes");
const { handlePostCreated, handlePostDeleted } = require("./eventHandlers/search-event-handler");
const app = express();
const PORT = process.env.PORT || 4004;

//connect to MongoDb
const mongoUri =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  "mongodb://localhost:27017/post-service";
mongoose.connect(mongoUri, {});
const redisClient = new Redis(process.env.REDIS_URL);
//  Security & body-parsing middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

//  Request logger
app.use((req, res, next) => {
  logger.info(`→ ${req.method} ${req.originalUrl}`, { body: req.body });
  next();
});

app.use("/api/search", searchRoutes);

app.use(errorHandler);

async function startServer() {
  try {
    await connectToRabbitMq();

    //consume the event
    await consumeEvent("post.created", handlePostCreated);
    await consumeEvent("post.deleted", handlePostDeleted);
  } catch (e) {
    logger.error("Failed to start the search Server", e);
    process.exit(1);
  }
}
startServer();
