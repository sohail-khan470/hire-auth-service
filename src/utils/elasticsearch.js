const { Client } = require("@elastic/elasticsearch");
const config = require("./config");

let client = null;

if (config.ELASTIC_SEARCH_URL) {
  client = new Client({
    node: config.ELASTIC_SEARCH_URL,
    // Add authentication if needed, e.g., apiKey or basic auth
    // auth: {
    //   username: 'elastic',
    //   password: 'password'
    // }
  });
}

module.exports = client;
