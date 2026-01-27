const { PrismaClient } = require("@prisma/client");
const { publishDirectMessage } = require("../queues/auth-producer");
const { getChannel } = require("../queues/rabbitmq");
const { signToken } = require("../utils/jwtService");
const config = require("../config/server-config");
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

const register = async (user) => {
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

const signJWT = async (id, email, username) => {
  try {
    const token = signToken({ id, email, username }, config.JWT_TOKEN_SECRET);
    return token;
  } catch (error) {
    throw createError("Failed to generate JWT token", 500);
  }
};

module.exports = {
  register,
  getAuthUserByUsername,
  getAuthUserByEmail,
  getAuthUserByVerificationToken,
  getAuthUserByPasswordToken,
  updateVerifyEmailField,
  getUserByUsernameOrEmail,
  signJWT,
};
