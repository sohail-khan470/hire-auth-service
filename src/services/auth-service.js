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
    "Buyer details sent to the buyer service"
  );

  return result; // 🔒 password is NOT here
};

module.exports = {
  createAuthUser,
};
