// src/config/config.js
require("dotenv").config();

module.exports = {
  // App
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT) || 4100,
  API_GATEWAY_URL: process.env.API_GATEWAY_URL || "http://localhost:4100",

  // Security
  GATEWAY_JWT_TOKEN: process.env.GATEWAY_JWT_TOKEN,

  // Infra
  RABBITMQ_ENDPOINT: process.env.RABBITMQ_ENDPOINT,
  REDIS_HOST: process.env.REDIS_HOST,

  // Database
  MYSQL_DB: process.env.MYSQL_DB,

  // Cloudinary
  CLOUD_NAME: process.env.CLOUD_NAME,
  CLOUD_API_KEY: process.env.CLOUD_API_KEY,
  CLOUD_API_SECRET: process.env.CLOUD_API_SECRET,

  // Elastic / APM
  ENABLE_APM: process.env.ENABLE_APM === "1",
  ELASTIC_SEARCH_URL: process.env.ELASTIC_SEARCH_URL,
  ELASTIC_APM_SERVER_URL: process.env.ELASTIC_APM_SERVER_URL,
  ELASTIC_APM_SECRET_TOKEN: process.env.ELASTIC_APM_SECRET_TOKEN,
};
