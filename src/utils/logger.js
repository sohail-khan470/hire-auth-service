const winston = require("winston");
const { ElasticsearchTransport } = require("winston-elasticsearch");
const config = require("./config");

const transports = [
  // Console transport for development
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }),
];

// Conditionally add Elasticsearch transport if URL is provided
if (config.ELASTIC_SEARCH_URL) {
  const esTransportOpts = {
    level: "info",
    clientOpts: {
      node: config.ELASTIC_SEARCH_URL,
      // Add auth if needed
    },
    indexPrefix: "authentication-service-logs",
    indexSuffixPattern: "YYYY-MM-DD",
    transformer: (logData) => {
      return {
        "@timestamp": new Date().toISOString(),
        severity: logData.level,
        message: logData.message,
        fields: logData.meta || {},
        service: "authentication-service",
      };
    },
  };
  transports.push(new ElasticsearchTransport(esTransportOpts));
}

const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "authentication-service" },
  transports: transports,
});

// Handle transport errors
logger.transports.forEach((transport) => {
  if (transport instanceof ElasticsearchTransport) {
    transport.on("error", (error) => {
      console.error("Elasticsearch transport error:", error);
    });
  }
});

module.exports = logger;
