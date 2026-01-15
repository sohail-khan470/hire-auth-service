// src/services/message-producer.js
const config = require("../utils/config");
const logger = require("../utils/logger");
const { rabbitmq } = require("./rabbitmq");

const amqp = require("amqplib");

let channel = null;

const EXCHANGE = "auth.events";
const QUEUE = "notification.user.registered";
const ROUTING_KEY = "user.registered";

async function init() {
  if (channel) return channel;

  const connection = await amqp.connect(process.env.RABBITMQ_URL);
  channel = await connection.createChannel();

  // Setup exchange & queue & binding
  await channel.assertExchange(EXCHANGE, "direct", { durable: true });
  await channel.assertQueue(QUEUE, { durable: true });
  await channel.bindQueue(QUEUE, EXCHANGE, ROUTING_KEY);

  process.on("SIGINT", async () => {
    await channel?.close();
    await connection?.close();
    process.exit(0);
  });

  return channel;
}

// Start consuming
async function start() {
  const ch = await init();

  await ch.consume(QUEUE, async (msg) => {
    if (!msg) return;

    try {
      const data = JSON.parse(msg.content.toString());
      console.log("📧 Send email to", data.email);
      ch.ack(msg);
    } catch (err) {
      console.error("❌ Consumer error:", err);
      ch.nack(msg, false, false); // send to DLQ if implemented
    }
  });

  console.log(`🎧 Consumer started on queue: ${QUEUE}`);
}

module.exports = { start };
