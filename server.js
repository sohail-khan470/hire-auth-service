const express = require("express");
const config = require("./src/utils/config");
const logger = require("./src/utils/logger");
const elasticsearchClient = require("./src/utils/elasticsearch");
const hpp = require("hpp");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");

const { rabbitmq } = require("./src/queues/rabbitmq");
const EmailConsumer = require("./src/queues/consumers/email.consumer");
const UserEventsConsumer = require("./src/queues/consumers/user-events.consumer");

const app = express();

/* -------------------- Middleware -------------------- */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(hpp());
app.use(helmet());
app.set("trust proxy", 1);
app.use(compression());
app.use(
  cors({
    origin: config.API_GATEWAY_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);

/* -------------------- Routes -------------------- */
app.get("/", (req, res) => {
  logger.info("Root endpoint accessed", {
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });
  res.json({ message: "Authentication Service is running" });
});

app.get("/health", (req, res) => {
  logger.info("Health check endpoint accessed");
  res.json({ status: "OK", service: "authentication-service" });
});

app.post("/auth/login", (req, res) => {
  logger.info("Login attempt", {
    email: req.body.email,
    ip: req.ip,
  });
  res.json({ message: "Login endpoint" });
});

/* -------------------- Error Handler -------------------- */
app.use((err, req, res, next) => {
  logger.error("Unhandled error", {
    error: err.message,
    stack: err.stack,
    url: req.url,
  });
  res.status(500).json({ error: "Internal Server Error" });
});

/* -------------------- RabbitMQ Consumers -------------------- */
async function startConsumers() {
  try {
    logger.info("Starting RabbitMQ consumers...");

    await EmailConsumer.start();
    await UserEventsConsumer.start();

    logger.info("All RabbitMQ consumers started");
  } catch (error) {
    logger.error("Failed to start consumers", {
      error: error.message,
    });
    throw error;
  }
}

/* -------------------- Server Bootstrap -------------------- */
const PORT = config.PORT;
let server;

async function startServer() {
  try {
    // 1️⃣ Connect RabbitMQ
    await rabbitmq.connect();
    logger.info("RabbitMQ connected");

    // 2️⃣ Start consumers
    await startConsumers();

    // 3️⃣ Start HTTP server
    server = app.listen(PORT, () => {
      logger.info(`Authentication service listening on port ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to start server", { error: error.message });
    process.exit(1);
  }
}

startServer();

/* -------------------- Graceful Shutdown -------------------- */
async function shutdown(signal) {
  logger.info(`Received ${signal}. Shutting down...`);

  if (server) {
    server.close(async () => {
      await rabbitmq.close();
      logger.info("Server shutdown complete");
      process.exit(0);
    });
  } else {
    await rabbitmq.close();
    process.exit(0);
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

/* -------------------- Elasticsearch Check -------------------- */
if (elasticsearchClient) {
  elasticsearchClient
    .ping()
    .then(() => logger.info("Elasticsearch connection successful"))
    .catch((err) => {
      logger.error("Elasticsearch connection failed", {
        error: err.message,
      });
    });
} else {
  logger.info("Elasticsearch not configured, skipping connection test");
}

module.exports = app;
