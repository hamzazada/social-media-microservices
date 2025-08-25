const amqp = require("amqplib");
const logger = require("./logger");

let connection = null;
let channel = null;

const EXCHANGE_NAME = "facebook events";

async function connectToRabbitMq() {
  try {
    connection = await amqp.connect(process.env.RABBIT_MQ);
    channel = await connection.createChannel();

    await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: false });
    logger.info("connected to rabbit mq");
    return channel;
  } catch (error) {
    logger.info("error connecting to rabbit mq", error);
  }
}
async function publishEvent(routingKey, message) {
  if (!channel) {
    await connectToRabbitMq();
  }
  channel.publish(
    EXCHANGE_NAME,
    routingKey,
    Buffer.from(JSON.stringify(message))
  );
  logger.info(`Event published: ${routingKey}`);
}
module.exports = { connectToRabbitMq, publishEvent };
