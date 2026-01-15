const amqplib = require("amqplib");
const config = require("../utils/config");
const logger = require("../utils/logger");

let connection = null;
let channel = null;

async function connectRabbitMQ() {
  if (channel) return channel; // already connected

  connection = await amqp.connect(config.RABBITMQ_ENDPOINT);
  channel = await connection.createChannel();

  // Optional: clean exit
  process.on("SIGINT", async () => {
    await channel?.close();
    await connection?.close();
    process.exit(0);
  });

  return channel;
}

module.exports = {
  connectRabbitMQ,
};
