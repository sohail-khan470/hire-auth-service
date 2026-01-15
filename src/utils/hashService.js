// services/hashService.js
const bcrypt = require("bcrypt");

const SALT_ROUNDS = 10;

class HashService {
  // Hash a plain text string
  static async hash(value) {
    return bcrypt.hash(value, SALT_ROUNDS);
  }

  // Compare a plain text string with a hash
  static async compare(value, hash) {
    return bcrypt.compare(value, hash);
  }
}

module.exports = HashService;
