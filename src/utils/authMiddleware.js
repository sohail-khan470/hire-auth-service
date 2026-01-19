const { verifyToken } = require("./jwtService");

const authMiddleware = async (req, res, next) => {
  try {
    if (!req.headers.authorization) {
      return res.status(401).json({ message: "Authorization header missing" });
    }

    const token = req.headers.authorization.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Token missing" });
    }

    const payload = verifyToken(token);
    req.user = payload; // Attach user info to request
    next();
  } catch (error) {
    return res.status(401).json({ message: error.message });
  }
};

module.exports = { authMiddleware };
