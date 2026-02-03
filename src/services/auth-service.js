const { PrismaClient } = require("@prisma/client");
const { publishDirectMessage } = require("../queues/auth-producer");
const { getChannel } = require("../queues/rabbitmq");
const { signToken } = require("../utils/jwtService");
const config = require("../config/server-config");
const { createError } = require("./error-service");
const { USER_CREATED } = require("../constants/routing-keys");
const prisma = new PrismaClient();
const crypto = require("crypto");

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
    const existingUser = await prisma.authUser.findFirst({
      where: {
        OR: [{ email: user.email }, { username: user.username }],
      },
    });

    const randomBytes = crypto.randomBytes(20).toString("hex");

    if (existingUser) {
      throw createError("User already exists", 409);
    }

    const createdUser = await prisma.authUser.create({
      data: {
        username: user.username,
        email: user.email,
        password: user.password, // already hashed
        country: user.country,
        profilePicture: user.profilePicture || null,
        profilePublicId: user.profilePublicId || null,
        emailVerified: false,
        emailVerificationToken: user.emailVerificationToken,
      },
      select: USER_SELECT_FIELDS,
    });

    const messageDetails = {
      userId: createdUser.id,
      username: createdUser.username,
      email: createdUser.email,
      profilePicture: createdUser.profilePicture,
      country: createdUser.country,
      createdAt: createdUser.createdAt,
      emailVerificationToken: randomBytes,
      type: "auth",
    };

    const channel = await getChannel();

    await publishDirectMessage(
      channel,
      config.RABBITMQ_EXCHANGE,
      USER_CREATED,
      messageDetails,
      "User created event sent",
    );

    return createdUser;
  } catch (error) {
    // Prisma unique constraint
    if (error.code === "P2002") {
      throw createError("Email or username already exists", 409);
    }

    throw createError(
      error.message || "Failed to register user",
      error.status || 500,
    );
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

const updateVerifyEmailField = async (id, emailVerificationToken) => {
  try {
    return await prisma.authUser.update({
      where: {
        id,
        emailVerificationToken,
        emailVerificationExpires: {
          gte: new Date(),
        },
      },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
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
