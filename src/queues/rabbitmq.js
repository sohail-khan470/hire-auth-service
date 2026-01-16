const amqp = require("amqplib");
const config = require("../utils/config");
const logger = require("../utils/logger");

let connection = null;
let channel = null;

async function connectRabbitMQ() {
  if (channel) return channel;

  try {
    connection = await amqp.connect(config.RABBITMQ_ENDPOINT);

    connection.on("error", (err) => {
      logger.error("RabbitMQ connection error", err);
      channel = null;
      connection = null;
    });

    connection.on("close", () => {
      logger.warn("RabbitMQ connection closed");
      channel = null;
      connection = null;
    });

    channel = await connection.createChannel();

    logger.info("✅ RabbitMQ connected");

    return channel;
  } catch (error) {
    logger.error("❌ Failed to connect to RabbitMQ", error);
    throw error;
  }
}

// Graceful shutdown
async function closeRabbitMQ() {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
    logger.info("RabbitMQ connection closed");
  } catch (err) {
    logger.error("Error closing RabbitMQ", err);
  }
}

process.on("SIGINT", closeRabbitMQ);
process.on("SIGTERM", closeRabbitMQ);

module.exports = {
  connectRabbitMQ,
  closeRabbitMQ,
};
