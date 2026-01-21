const queues = require("./queue");
const routingKeys = require("./routing-keys");

module.exports = {
  ...queues,
  ...routingKeys,
};
