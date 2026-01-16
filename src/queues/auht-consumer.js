const { connectRabbitMQ } = require("./rabbitmq");

async function consumeUserCreated() {
  const channel = await connectRabbitMQ();

  const EXCHANGE = "auth_exchange";
  const QUEUE = "user_service_queue";

  await channel.assertExchange(EXCHANGE, "direct", { durable: true });
  await channel.assertQueue(QUEUE, { durable: true });
  await channel.bindQueue(QUEUE, EXCHANGE, "user.created");

  channel.consume(QUEUE, async (msg) => {
    if (!msg) return;

    const data = JSON.parse(msg.content.toString());
    console.log("Received:", data);

    channel.ack(msg);
  });
}

consumeUserCreated();
