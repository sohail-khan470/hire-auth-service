const amqp = require("amqplib");
const config = require("../utils/config");
const logger = require("../utils/logger");
const { connectRabbitMQ } = require("./rabbitmq");

async function publishDirectMessage(
  channel,
  exchangeName,
  routingKey,
  message,
  logMessage = "Message published"
) {
  try {
    // 1️⃣ Ensure channel
    if (!channel) {
      channel = await connectRabbitMQ();
    }

    // 2️⃣ Assert exchange
    await channel.assertExchange(exchangeName, "direct", {
      durable: true,
    });

    // 3️⃣ Publish message
    const published = channel.publish(
      exchangeName,
      routingKey,
      Buffer.from(JSON.stringify(message)),
      {
        persistent: true,
        contentType: "application/json",
      }
    );

    if (!published) {
      logger.warn("RabbitMQ publish returned false (buffer full)");
    }

    logger.info(`${logMessage} | exchange=${exchangeName}, key=${routingKey}`);
  } catch (error) {
    logger.error("RabbitMQ publish error", {
      error: error.message,
      exchangeName,
      routingKey,
      message,
    });

    throw error;
  }
}

module.exports = {
  publishDirectMessage,
};
