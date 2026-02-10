const authService = require("../services/auth-service");
const { handleAsync, handleError } = require("../services/error-service");
const { hashPassword } = require("../utils/hashService");
const { StatusCodes } = require("http-status-codes");
const logger = require("../utils/logger");
const crypto = require("crypto");

const register = handleAsync(async (req, res) => {
  const { username, email, password, country } = req.body;

  if (!username || !email || !password) {
    return handleError(
      {
        statusCode: StatusCodes.BAD_REQUEST,
        message: "Username, email, and password are required",
      },
      res,
    );
  }

  const existingUser = await authService.getUserByUsernameOrEmail(
    username,
    email,
  );
  if (existingUser) {
    return handleError(
      {
        statusCode: StatusCodes.CONFLICT,
        message: "User already exists",
      },
      res,
    );
  }

  const hashedPassword = await hashPassword(password);

  const profilePicture = req.file
    ? {
        url: req.file.path,
        publicId: req.file.filename,
      }
    : null;

  const user = await authService.register({
    username,
    email,
    password: hashedPassword,
    country: country || "",
    profilePicture: profilePicture?.url || "",
    profilePublicId: profilePicture?.publicId || "",
  });

  logger.info(`New user created: ${user.username}`);

  res.status(StatusCodes.CREATED).json({
    message: "User created successfully",
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      country: user.country,
      profilePicture: user.profilePicture,
      createdAt: user.createdAt,
    },
  });
});

const updateProfilePicture = async (req, res) => {
  try {
    const userId = req.user.id; // from JWT auth middleware
    const updatedUser = await authService.updateProfilePicture(
      userId,
      req.body,
    );
    res.status(200).json(updatedUser);
  } catch (err) {
    next(err);
  }
};

const verifyEmail = async (req, res) => {
  try {
  } catch (error) {}
};

module.exports = { register, updateProfilePicture };
