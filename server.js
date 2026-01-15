const express = require("express");
const config = require("./src/utils/config");
const logger = require("./src/utils/logger");
const elasticsearchClient = require("./src/utils/elasticsearch");
const hpp = require("hpp");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const { rabbitmq } = require("./src/queues/rabbitmq");

const app = express();

// Middleware
app.use(express.json());
app.use(hpp());
app.use(helmet());
app.set("trust proxy", 1);
app.set(express.urlencoded({ extended: true }));
app.use(compression());
app.use(express.json());
app.use(
  cors({
    origin: config.API_GATEWAY_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);

// Basic route
app.get("/", (req, res) => {
  logger.info("Root endpoint accessed", {
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });
  res.json({ message: "Authentication Service is running" });
});

// Health check
app.get("/health", (req, res) => {
  logger.info("Health check endpoint accessed");
  res.json({ status: "OK", service: "authentication-service" });
});

// Example route with logging
app.post("/auth/login", (req, res) => {
  logger.info("Login attempt", { email: req.body.email, ip: req.ip });
  // Placeholder for actual login logic
  res.json({ message: "Login endpoint" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error("Unhandled error", {
    error: err.message,
    stack: err.stack,
    url: req.url,
  });
  res.status(500).json({ error: "Internal Server Error" });
});

//Start Rabbitmq

// Start server
const PORT = config.PORT;

const startServer = async () => {
  await rabbitmq.connect();
  app.listen(PORT, () => {
    logger.info(`Authentication service listening on port ${PORT}`);
  });
};

startServer();

// Test Elasticsearch connection if client is available
if (elasticsearchClient) {
  elasticsearchClient
    .ping()
    .then(() => logger.info("Elasticsearch connection successful"))
    .catch((err) => {
      console.log(err);
      logger.error("Elasticsearch connection failed", { error: err.message });
    });
} else {
  logger.info("Elasticsearch not configured, skipping connection test");
}

module.exports = app;
