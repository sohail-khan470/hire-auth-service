const express = require("express");
const config = require("./src/config/server-config");
const logger = require("./src/utils/logger");
const elasticsearchClient = require("./src/utils/elasticsearch");
const hpp = require("hpp");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");

const rabbitMQ = require("./src/queues/rabbitmq");
const authPublisher = require("./src/queues/auth-producer");
const { AuthRoutes } = require("./src/routes");

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
  }),
);

/* -------------------- Routes -------------------- */

app.get("/health", (req, res) => {
  logger.info("Health check endpoint accessed");
  res.json({ status: "OK", service: "authentication-service" });
});

app.use("/api/v1", AuthRoutes);

/* -------------------- Error Handler -------------------- */
app.use((err, req, res, next) => {
  logger.error("Unhandled error", {
    error: err.message,
    stack: err.stack,
    url: req.url,
  });
  res.status(500).json({ error: "Internal Server Error" });
});

/* -------------------- Server Bootstrap -------------------- */
const PORT = config.PORT;
let server;

async function startServer() {
  try {
    // 1️⃣ Connect RabbitMQ
    await rabbitMQ.connectRabbitMQ();
    logger.info("RabbitMQ connected");
    // 2 Start HTTP server
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
      await rabbitMQ.closeRabbitMQ();
      logger.info("Server shutdown complete");
      process.exit(0);
    });
  } else {
    await rabbitMQ.closeRabbitMQ();
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
