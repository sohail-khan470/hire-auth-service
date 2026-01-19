const { PrismaClient } = require("@prisma/client");
const { CREATED } = require("http-status-codes");
const { publishDirectMessage } = require("../queues/auth-producer");
const { getChannel } = require("../queues/rabbitmq");
const prisma = new PrismaClient();

const createAuthUser = async (user) => {
  const result = await prisma.authUser.create({
    data: user,
    select: {
      id: true,
      username: true,
      email: true,
      country: true,
      profilePublicId: true,
      profilePicture: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });

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
};

const getAuthUserByUsername = async (username) => {
  return await prisma.authUser.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      email: true,
      country: true,
      profilePublicId: true,
      profilePicture: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

const getAuthUserByEmail = async (email) => {
  return await prisma.authUser.findUnique({
    where: { email },
    select: {
      id: true,
      username: true,
      email: true,
      country: true,
      profilePublicId: true,
      profilePicture: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

const getAuthUserByVerificationToken = async (token) => {
  return await prisma.authUser.findFirst({
    where: { emailVerificationToken: token },
    select: {
      id: true,
      username: true,
      email: true,
      country: true,
      profilePublicId: true,
      profilePicture: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

const getAuthUserByPasswordToken = async (token) => {
  return await prisma.authUser.findFirst({
    where: { passwordResetToken: token },
    select: {
      id: true,
      username: true,
      email: true,
      country: true,
      profilePublicId: true,
      profilePicture: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

const updateVerifyEmailField = async (
  id,
  emailVerified,
  emailVerificationToken,
) => {
  return await prisma.authUser.update({
    where: { id },
    data: {
      emailVerified,
      emailVerificationToken,
    },
    select: {
      id: true,
      username: true,
      email: true,
      country: true,
      profilePublicId: true,
      profilePicture: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

module.exports = {
  createAuthUser,
  getAuthUserByUsername,
  getAuthUserByEmail,
  getAuthUserByVerificationToken,
  getAuthUserByPasswordToken,
  updateVerifyEmailField,
};
