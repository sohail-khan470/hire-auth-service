const {
  createAuthUser,
  getUserByUsernameOrEmail,
} = require("../services/auth-service");
const { handleAsync, handleError } = require("../services/error-service");
const { hashPassword } = require("../utils/hashService");
const { StatusCodes } = require("http-status-codes");
const logger = require("../utils/logger");

/**
 * Controller for user signup/registration
 */
const createAuthUserController = handleAsync(async (req, res) => {
  const { username, email, password, country, profilePicture } = req.body;

  // Validate required fields
  if (!username || !email || !password) {
    return handleError(
      {
        statusCode: StatusCodes.BAD_REQUEST,
        message: "Username, email, and password are required",
      },
      res,
    );
  }

  // Check if user already exists
  const existingUser = await getUserByUsernameOrEmail(username, email);
  if (existingUser) {
    logger.warn(`Signup attempt for existing user: ${username || email}`);
    return handleError(
      {
        statusCode: StatusCodes.CONFLICT,
        message: "User with this username or email already exists",
      },
      res,
    );
  }

  // Hash the password
  const hashedPassword = await hashPassword(password);

  // Create the user
  const user = await createAuthUser({
    username,
    email,
    password: hashedPassword,
    country: country || "",
    profilePicture: profilePicture || "",
  });

  logger.info(`New user created: ${user.username} (${user.email})`);

  // Return success response (exclude sensitive data)
  res.status(StatusCodes.CREATED).json({
    message: "User created successfully",
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      country: user.country,
      profilePicture: user.profilePicture,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    },
  });
});

module.exports = {
  createAuthUserController,
};
