// src/services/rabbitmq.js
const amqp = require("amqplib");
const logger = require("../utils/logger");
const config = require("../utils/config");

class RabbitMQConnection {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.isConnected = false;

    // Extract RabbitMQ config
    this.config = this._parseRabbitMQConfig();

    // Connection retry settings
    this.maxRetries = 5;
    this.retryDelay = 3000;
    this.retryCount = 0;
  }

  _parseRabbitMQConfig() {
    logger.debug("Parsing RabbitMQ configuration AuthService");

    if (config.RABBITMQ_ENDPOINT) {
      try {
        const url = new URL(config.RABBITMQ_ENDPOINT);
        return {
          protocol: url.protocol.replace(":", ""),
          hostname: url.hostname,
          port: parseInt(url.port) || 5672,
          username: url.username || "admin",
          password: url.password || "admin",
          vhost: url.pathname.replace("/", "") || "/",
        };
      } catch (error) {
        logger.error("Failed to parse RABBITMQ_ENDPOINT URL AuthService", {
          error: error.message,
        });
      }
    }

    // Fallback to individual environment variables
    return {
      protocol: "amqp",
      hostname: process.env.RABBITMQ_HOST || "rabbitmq_container",
      port: parseInt(process.env.RABBITMQ_PORT) || 5672,
      username: process.env.RABBITMQ_USERNAME || "admin",
      password: process.env.RABBITMQ_PASSWORD || "admin",
      vhost: process.env.RABBITMQ_VHOST || "/",
    };
  }

  async connect() {
    if (this.isConnected && this.channel) {
      logger.debug("RabbitMQ already connected, returning existing channel");
      return this.channel;
    }

    try {
      logger.info("Connecting to RabbitMQ", {
        host: this.config.hostname,
        port: this.config.port,
        username: this.config.username,
        vhost: this.config.vhost,
        environment: config.NODE_ENV,
      });

      const connectionOptions = {
        protocol: this.config.protocol,
        hostname: this.config.hostname,
        port: this.config.port,
        username: this.config.username,
        password: this.config.password,
        vhost: this.config.vhost,
        heartbeat: 60,
      };

      this.connection = await amqp.connect(connectionOptions);
      this.channel = await this.connection.createChannel();
      this.isConnected = true;
      this.retryCount = 0;

      logger.info("RabbitMQ connected successfully", {
        host: this.config.hostname,
        port: this.config.port,
        vhost: this.config.vhost,
      });

      // Connection event handlers
      this.connection.on("error", (error) => {
        logger.error("RabbitMQ connection error", {
          error: error.message,
          stack: error.stack,
          host: this.config.hostname,
        });
        this.isConnected = false;
        this._handleConnectionError(error);
      });

      this.connection.on("close", () => {
        logger.warn("RabbitMQ connection closed", {
          host: this.config.hostname,
          retryCount: this.retryCount,
        });
        this.isConnected = false;
        this._reconnect();
      });

      logger.debug("RabbitMQ connection established", {
        isConnected: this.isConnected,
        protocol: this.config.protocol,
      });

      return this.channel;
    } catch (error) {
      logger.error("Failed to connect to RabbitMQ", {
        error: error.message,
        stack: error.stack,
        host: this.config.hostname,
        port: this.config.port,
        retryCount: this.retryCount + 1,
      });

      this._handleConnectionError(error);
      throw error;
    }
  }

  _handleConnectionError(error) {
    this.isConnected = false;

    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      logger.warn("RabbitMQ connection retry", {
        attempt: this.retryCount,
        maxRetries: this.maxRetries,
        delay: `${this.retryDelay / 1000}s`,
        error: error.message,
      });

      setTimeout(() => {
        this.connect().catch(() => {
          // Retry will be handled by the catch block
        });
      }, this.retryDelay);
    } else {
      logger.error("Maximum RabbitMQ retry attempts reached", {
        maxRetries: this.maxRetries,
        host: this.config.hostname,
        environment: config.NODE_ENV,
      });

      if (config.NODE_ENV === "production") {
        logger.warn("Continuing without RabbitMQ connection");
      }
    }
  }

  async _reconnect() {
    logger.info("Attempting to reconnect to RabbitMQ");
    this._handleConnectionError(new Error("Connection lost"));
  }

  async assertQueue(queueName, options = {}) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const queueOptions = {
        durable: true,
        ...options,
      };

      await this.channel.assertQueue(queueName, queueOptions);

      logger.debug("Queue asserted", {
        queue: queueName,
        options: queueOptions,
        environment: config.NODE_ENV,
      });

      return {
        queue: queueName,
        messageCount: 0,
        consumerCount: 0,
      };
    } catch (error) {
      logger.error("Failed to assert queue", {
        queue: queueName,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  async sendToQueue(queueName, data, options = {}) {
    const startTime = Date.now();

    try {
      if (!this.isConnected) {
        await this.connect();
      }

      await this.assertQueue(queueName);

      const message = Buffer.isBuffer(data)
        ? data
        : Buffer.from(JSON.stringify(data));

      const sendOptions = {
        persistent: true,
        ...options,
      };

      const sent = this.channel.sendToQueue(queueName, message, sendOptions);

      if (sent) {
        const duration = Date.now() - startTime;

        logger.info("Message sent to queue", {
          queue: queueName,
          sent: true,
          duration: `${duration}ms`,
          messageSize: message.length,
          environment: config.NODE_ENV,
        });

        // Debug logging for message content
        if (config.LOG_LEVEL === "debug") {
          logger.debug("Message content", {
            queue: queueName,
            dataType: typeof data,
            dataPreview:
              typeof data === "object"
                ? JSON.stringify(data).substring(0, 200)
                : String(data).substring(0, 200),
          });
        }
      } else {
        logger.warn("Message not sent to queue", {
          queue: queueName,
          sent: false,
        });
      }

      return sent;
    } catch (error) {
      logger.error("Failed to send message to queue", {
        queue: queueName,
        error: error.message,
        stack: error.stack,
        duration: `${Date.now() - startTime}ms`,
      });
      throw error;
    }
  }

  async consume(queueName, callback, options = {}) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      await this.assertQueue(queueName);

      const consumerOptions = {
        noAck: false,
        ...options,
      };

      if (options.prefetch && options.prefetch > 0) {
        await this.channel.prefetch(options.prefetch);
      }

      logger.info("Starting queue consumer", {
        queue: queueName,
        prefetch: options.prefetch || "default",
        environment: config.NODE_ENV,
      });

      return this.channel.consume(
        queueName,
        async (message) => {
          const startTime = Date.now();

          if (!message) {
            logger.warn("Received null message from queue", {
              queue: queueName,
            });
            return;
          }

          try {
            let content;
            try {
              content = JSON.parse(message.content.toString());
            } catch (parseError) {
              content = message.content.toString();
            }

            // Log incoming message
            logger.info("Message received from queue", {
              queue: queueName,
              messageId: message.properties.messageId || "unknown",
              contentType: message.properties.contentType || "unknown",
              size: message.content.length,
              environment: config.NODE_ENV,
            });

            if (config.LOG_LEVEL === "debug") {
              logger.debug("Message content received", {
                queue: queueName,
                contentPreview:
                  typeof content === "object"
                    ? JSON.stringify(content).substring(0, 200)
                    : String(content).substring(0, 200),
              });
            }

            // Process message
            await callback(content, {
              messageId: message.properties.messageId,
              timestamp: message.properties.timestamp,
              headers: message.properties.headers,
            });

            // Acknowledge message
            this.channel.ack(message);

            const duration = Date.now() - startTime;
            logger.info("Message processed successfully", {
              queue: queueName,
              duration: `${duration}ms`,
              status: "acknowledged",
            });
          } catch (error) {
            const duration = Date.now() - startTime;

            logger.error("Error processing message", {
              queue: queueName,
              error: error.message,
              stack: error.stack,
              duration: `${duration}ms`,
              messageSize: message.content.length,
            });

            // Handle error based on configuration
            if (options.noRetry || error.noRetry) {
              this.channel.ack(message);
              logger.warn("Message dropped (no retry)", {
                queue: queueName,
                reason: error.message,
              });
            } else {
              this.channel.nack(message, false, true);
              logger.warn("Message requeued", {
                queue: queueName,
                reason: error.message,
                retryCount: message.properties.headers?.["x-retry-count"] || 0,
              });
            }
          }
        },
        consumerOptions
      );
    } catch (error) {
      logger.error("Failed to start queue consumer", {
        queue: queueName,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  async createExchange(exchangeName, type = "direct", options = {}) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const exchangeOptions = {
        durable: true,
        ...options,
      };

      await this.channel.assertExchange(exchangeName, type, exchangeOptions);

      logger.info("Exchange created", {
        exchange: exchangeName,
        type: type,
        options: exchangeOptions,
        environment: config.NODE_ENV,
      });

      return exchangeName;
    } catch (error) {
      logger.error("Failed to create exchange", {
        exchange: exchangeName,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  async bindQueue(queueName, exchangeName, routingKey = "", args = {}) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      await this.channel.bindQueue(queueName, exchangeName, routingKey, args);

      logger.info("Queue bound to exchange", {
        queue: queueName,
        exchange: exchangeName,
        routingKey: routingKey,
        args: args,
        environment: config.NODE_ENV,
      });

      return true;
    } catch (error) {
      logger.error("Failed to bind queue to exchange", {
        queue: queueName,
        exchange: exchangeName,
        routingKey: routingKey,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  async publish(exchangeName, routingKey, data, options = {}) {
    const startTime = Date.now();

    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const message = Buffer.isBuffer(data)
        ? data
        : Buffer.from(JSON.stringify(data));

      const publishOptions = {
        persistent: true,
        ...options,
      };

      this.channel.publish(exchangeName, routingKey, message, publishOptions);

      const duration = Date.now() - startTime;

      logger.info("Message published to exchange", {
        exchange: exchangeName,
        routingKey: routingKey,
        duration: `${duration}ms`,
        messageSize: message.length,
        environment: config.NODE_ENV,
      });

      if (config.LOG_LEVEL === "debug") {
        logger.debug("Published message content", {
          exchange: exchangeName,
          routingKey: routingKey,
          dataType: typeof data,
          dataPreview:
            typeof data === "object"
              ? JSON.stringify(data).substring(0, 200)
              : String(data).substring(0, 200),
        });
      }

      return true;
    } catch (error) {
      logger.error("Failed to publish to exchange", {
        exchange: exchangeName,
        routingKey: routingKey,
        error: error.message,
        stack: error.stack,
        duration: `${Date.now() - startTime}ms`,
      });
      throw error;
    }
  }

  async getQueueInfo(queueName) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const queueInfo = await this.channel.checkQueue(queueName);

      logger.debug("Queue info retrieved", {
        queue: queueName,
        messageCount: queueInfo.messageCount,
        consumerCount: queueInfo.consumerCount,
      });

      return queueInfo;
    } catch (error) {
      logger.error("Failed to get queue info", {
        queue: queueName,
        error: error.message,
      });
      return null;
    }
  }

  async purgeQueue(queueName) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const result = await this.channel.purgeQueue(queueName);

      logger.info("Queue purged", {
        queue: queueName,
        messageCount: result.messageCount,
        environment: config.NODE_ENV,
      });

      return result;
    } catch (error) {
      logger.error("Failed to purge queue", {
        queue: queueName,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  async close() {
    const startTime = Date.now();

    try {
      if (this.channel) {
        await this.channel.close();
        logger.debug("RabbitMQ channel closed");
      }
      if (this.connection) {
        await this.connection.close();
        logger.debug("RabbitMQ connection closed");
      }
      this.isConnected = false;

      const duration = Date.now() - startTime;
      logger.info("RabbitMQ connection closed gracefully", {
        duration: `${duration}ms`,
        environment: config.NODE_ENV,
      });
    } catch (error) {
      logger.error("Error closing RabbitMQ connection", {
        error: error.message,
        stack: error.stack,
        duration: `${Date.now() - startTime}ms`,
      });
    }
  }

  getConnectionStatus() {
    const status = {
      isConnected: this.isConnected,
      host: this.config.hostname,
      port: this.config.port,
      username: this.config.username,
      vhost: this.config.vhost,
      environment: config.NODE_ENV,
      retryCount: this.retryCount,
      timestamp: new Date().toISOString(),
    };

    logger.debug("RabbitMQ connection status", status);

    return status;
  }

  // Helper method for structured logging
  _logRabbitMQOperation(operation, details) {
    logger.info(`RabbitMQ ${operation}`, {
      ...details,
      service: "rabbitmq-connection",
      timestamp: new Date().toISOString(),
      environment: config.NODE_ENV,
    });
  }
}

// Create and export singleton instance
const rabbitmq = new RabbitMQConnection();

// Export both the instance and the class
module.exports = {
  rabbitmq,
  RabbitMQConnection,
};
