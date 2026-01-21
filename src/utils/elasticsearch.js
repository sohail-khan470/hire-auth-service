// src/config/elasticsearch.js
const { Client } = require("@elastic/elasticsearch");
const config = require("../config/server-config");
const logger = require("./logger");

let client = null;

if (!config.ELASTIC_SEARCH_URL) {
  logger.warn("[ELASTIC] ELASTIC_SEARCH_URL not set. Elasticsearch disabled.");
} else {
  try {
    client = new Client({
      node: config.ELASTIC_SEARCH_URL,
      maxRetries: 5,
      requestTimeout: 60000,
      sniffOnStart: false,
    });

    // Optional lightweight health check
    client
      .ping()
      .then(() => {
        logger.info("[ELASTIC] Connected to Elasticsearch");
      })
      .catch((err) => {
        logger.error("[ELASTIC] Elasticsearch unreachable:", err.message);
      });
  } catch (err) {
    logger.error("[ELASTIC] Failed to initialize client:", err.message);
  }
}

module.exports = client;
