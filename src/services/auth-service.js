const { PrismaClient } = require("@prisma/client");
const { publishDirectMessage } = require("../queues/auth-producer");
const { getChannel } = require("../queues/rabbitmq");
const { signToken } = require("../utils/jwtService");
const config = require("../utils/config");
const { createError } = require("./error-service");
const prisma = new PrismaClient();

// Common user fields for select statements
const USER_SELECT_FIELDS = {
  id: true,
  username: true,
  email: true,
  country: true,
  profilePublicId: true,
  profilePicture: true,
  emailVerified: true,
  createdAt: true,
  updatedAt: true,
};

/**
 * Creates a new authenticated user and publishes creation event
 * @param {Object} user - User data to create
 * @returns {Object} Created user data
 */
const createAuthUser = async (user) => {
  try {
    const result = await prisma.authUser.create({
      data: user,
      select: USER_SELECT_FIELDS,
    });

    // Publish user creation event to message queue
    const messageDetails = {
      username: result.username,
      email: result.email,
      profilePicture: result.profilePicture,
      country: result.country,
      createdAt: result.createdAt,
    };

    const channel = await getChannel();
    await publishDirectMessage(
      channel,
      "jobber-buyer-update",
      "user-buyer",
      messageDetails,
      "Buyer details sent to the buyer service",
    );

    return result;
  } catch (error) {
    throw createError("Failed to create user", 500);
  }
};

/**
 * Retrieves a user by username
 * @param {string} username - Username to search for
 * @returns {Object|null} User data or null if not found
 */
const getAuthUserByUsername = async (username) => {
  try {
    return await prisma.authUser.findUnique({
      where: { username },
      select: USER_SELECT_FIELDS,
    });
  } catch (error) {
    throw createError("Failed to retrieve user by username", 500);
  }
};

/**
 * Retrieves a user by email
 * @param {string} email - Email to search for
 * @returns {Object|null} User data or null if not found
 */
const getAuthUserByEmail = async (email) => {
  try {
    return await prisma.authUser.findUnique({
      where: { email },
      select: USER_SELECT_FIELDS,
    });
  } catch (error) {
    throw createError("Failed to retrieve user by email", 500);
  }
};

/**
 * Retrieves a user by email verification token
 * @param {string} token - Verification token
 * @returns {Object|null} User data or null if not found
 */
const getAuthUserByVerificationToken = async (token) => {
  try {
    return await prisma.authUser.findFirst({
      where: { emailVerificationToken: token },
      select: USER_SELECT_FIELDS,
    });
  } catch (error) {
    throw createError("Failed to retrieve user by verification token", 500);
  }
};

/**
 * Retrieves a user by password reset token
 * @param {string} token - Password reset token
 * @returns {Object|null} User data or null if not found
 */
const getAuthUserByPasswordToken = async (token) => {
  try {
    return await prisma.authUser.findFirst({
      where: { passwordResetToken: token },
      select: USER_SELECT_FIELDS,
    });
  } catch (error) {
    throw createError("Failed to retrieve user by password token", 500);
  }
};

/**
 * Updates email verification fields for a user
 * @param {string} id - User ID
 * @param {boolean} emailVerified - Verification status
 * @param {string|null} emailVerificationToken - Verification token
 * @returns {Object} Updated user data
 */
const updateVerifyEmailField = async (
  id,
  emailVerified,
  emailVerificationToken,
) => {
  try {
    return await prisma.authUser.update({
      where: { id },
      data: {
        emailVerified,
        emailVerificationToken,
      },
      select: USER_SELECT_FIELDS,
    });
  } catch (error) {
    throw createError("Failed to update email verification", 500);
  }
};

/**
 * Retrieves a user by username or email
 * @param {string} username - Username to search
 * @param {string} email - Email to search
 * @returns {Object|null} User data or null if not found
 */
const getUserByUsernameOrEmail = async (username, email) => {
  try {
    return await prisma.authUser.findFirst({
      where: {
        OR: [{ username }, { email }],
      },
      select: USER_SELECT_FIELDS,
    });
  } catch (error) {
    throw createError("Failed to retrieve user by username or email", 500);
  }
};

/**
 * Generates a JWT token for authenticated users
 * @param {string} id - User ID
 * @param {string} email - User email
 * @param {string} username - Username
 * @returns {string} JWT token
 */
const signJWT = async (id, email, username) => {
  try {
    const token = signToken({ id, email, username }, config.JWT_TOKEN_SECRET);
    return token;
  } catch (error) {
    throw createError("Failed to generate JWT token", 500);
  }
};

module.exports = {
  createAuthUser,
  getAuthUserByUsername,
  getAuthUserByEmail,
  getAuthUserByVerificationToken,
  getAuthUserByPasswordToken,
  updateVerifyEmailField,
  getUserByUsernameOrEmail,
  signJWT,
};
