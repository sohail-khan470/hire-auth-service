const jwt = require("jsonwebtoken");
const config = require("./config");

const authMiddleware = async (req, res, next) => {
  if (req.headers.authorization) {
    const token = req.headers.authorization.split(" ")[1];
    const payload = await jwt.verify(token, config.JWT_TOKEN_SECRET);
  }
};

module.exports = { authMiddleware };
