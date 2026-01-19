const jwt = require("jsonwebtoken");
const config = require("./config");

const signToken = (
  payload,
  secret = config.JWT_TOKEN_SECRET,
  expiresIn = "7d",
) => {
  return jwt.sign(payload, secret, { expiresIn });
};

const verifyToken = (token, secret = config.JWT_TOKEN_SECRET) => {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
};

const decodeToken = (token) => {
  return jwt.decode(token);
};

module.exports = {
  signToken,
  verifyToken,
  decodeToken,
};
