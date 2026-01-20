const { StatusCodes } = require("http-status-codes");

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

const createError = (message, statusCode) => {
  return new AppError(message, statusCode);
};

const handleError = (err, res) => {
  const {
    statusCode = StatusCodes.INTERNAL_SERVER_ERROR,
    status = "error",
    message,
  } = err;

  res.status(statusCode).json({
    status,
    message,
  });
};

const handleAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

module.exports = {
  AppError,
  createError,
  handleError,
  handleAsync,
};
