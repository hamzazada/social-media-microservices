require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const mediaRoutes = require("./routes/media-routes");
const errorHandler = require("./middleware/errorHandler");
const logger = require("./utils/logger");
const { connectToRabbitMq, consumeEvent } = require("./utils/rabbitmq");
const { handlePostDeleted } = require("./eventHandlers/media-event-handlers");

const app = express();

const PORT = process.env.PORT || 4003;

//connect to mongoDB
mongoose
  .connect(
    process.env.MONGO_URI ||
      process.env.MONGODB_URI ||
      "mongodb://localhost:27017/post-service"
  )
  .then(() => logger.info("connected to mongoDB"))
  .catch((e) => logger.warn("mongo connection error", e));

//middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

//Request logger
app.use((req, res, next) => {
  logger.info(`→ ${req.method} ${req.originalUrl}`, { body: req.body });
  next();
});

app.use("/api/media", mediaRoutes);
app.use(errorHandler);

//consume all the events

async function startServer() {
  await consumeEvent("post.deleted", handlePostDeleted);
  try {
    await connectToRabbitMq();
    // 11. Start server
    app.listen(PORT, () => {
      logger.info(`media server is running on port ${PORT}`);
    });
  } catch (error) {
    logger.info("failed to connect to start server", error);
  }
}
startServer();
// //  Start server
// app.listen(PORT, () => {
//   logger.info(`Server is running on port ${PORT}`);
// });

//  Catch unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise}\nReason: ${reason}`);
  // Optionally: process.exit(1);
});
