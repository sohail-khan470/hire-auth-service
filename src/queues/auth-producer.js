// src/services/message-producer.js
const config = require("../utils/config");
const logger = require("../utils/logger");
const { rabbitmq } = require("./rabbitmq");

const amqp = require("amqplib");

let channel = null;

const EXCHANGE = "auth.events";
const ROUTING_KEY = "user.registered";

async function init() {
  if (channel) return channel;

  const connection = await amqp.connect(config.RABBITMQ_ENDPOINT);
  channel = await connection.createChannel();

  // Ensure exchange exists
  await channel.assertExchange(EXCHANGE, "direct", { durable: true });

  // Clean exit
  process.on("SIGINT", async () => {
    await channel?.close();
    await connection?.close();
    process.exit(0);
  });

  return channel;
}

async function publish(payload) {
  const ch = await init();

  ch.publish(EXCHANGE, ROUTING_KEY, Buffer.from(JSON.stringify(payload)), {
    persistent: true,
    contentType: "application/json",
  });

  logger.info(`📤 Published ${ROUTING_KEY} to ${EXCHANGE}`);
}

// Optional: expose a start function if you want to pre-connect on service start
async function start() {
  await init();
  logger.info("✅ Producer ready");
}

module.exports = { publish, start };
