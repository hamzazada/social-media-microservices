const amqp = require("amqplib");
const logger = require("./logger");

let connection = null;
let channel = null;

const EXCHANGE_NAME = "facebook_events";

async function connectToRabbitMq() {
  try {
    connection = await amqp.connect(process.env.RABBIT_MQ);
    channel = await connection.createChannel();

    await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: false });
    logger.info("connected to rabbit mq");
    return channel;
  } catch (error) {
    logger.error("error connecting to rabbit mq", error);
  }
}

async function consumeEvent(routingkey, callback) {
  if (!channel) {
    await connectToRabbitMq();
  }
  const q = await channel.assertQueue("", { exclusive: true });
  await channel.bindQueue(q.queue, EXCHANGE_NAME, routingkey);
  channel.consume(q.queue, (msg) => {
    if (msg !== null) {
      const content = JSON.parse(msg.content.toString());
      callback(content);
      channel.ack(msg);
    }
  });
  logger.info(`subscribed to event:${routingkey}`);
}
module.exports = { connectToRabbitMq, consumeEvent };
