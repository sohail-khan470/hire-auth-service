// src/config/config.js
require("dotenv").config();

module.exports = {
  /* =======================
     App
  ======================= */
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT) || 4102,
  API_GATEWAY_URL: process.env.API_GATEWAY_URL || "http://localhost:4100",
  JWT_TOKEN_SECRET: process.env.JWT_TOKEN_SECRET,

  /* =======================
     Security
  ======================= */
  GATEWAY_JWT_TOKEN: process.env.GATEWAY_JWT_TOKEN,

  /* =======================
     Infra
  ======================= */
  RABBITMQ_ENDPOINT: process.env.RABBITMQ_ENDPOINT,
  RABBITMQ_EXCHANGE: process.env.RABBITMQ_EXCHANGE,

  /* =======================
     Database
  ======================= */
  DATABASE_URL:
    process.env.DATABASE_URL || "mysql://root:root@localhost:3306/mydb",

  /* =======================
     Cloudinary
  ======================= */
  CLOUD_NAME: process.env.CLOUD_NAME || "",
  CLOUD_API_KEY: process.env.CLOUD_API_KEY || "",
  CLOUD_API_SECRET: process.env.CLOUD_API_SECRET || "",

  /* =======================
     Elastic / APM
  ======================= */
  ENABLE_APM: process.env.ENABLE_APM === "1",
  ELASTIC_SEARCH_URL: process.env.ELASTIC_SEARCH_URL,
  ELASTIC_APM_SERVER_URL: process.env.ELASTIC_APM_SERVER_URL,
  ELASTIC_APM_SECRET_TOKEN: process.env.ELASTIC_APM_SECRET_TOKEN || "",

  /* =======================
     Logger
  ======================= */
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
};
