const { PrismaClient } = require("@prisma/client");
const { CREATED } = require("http-status-codes");
const { publishDirectMessage } = require("../queues/auth-producer");
const { getChannel } = require("../queues/rabbitmq");
const prisma = new PrismaClient();

const createAuthUser = async (user) => {
  const result = await prisma.authUser.create(user);
  const messageDetails = {
    username: result.username,
    email: result.email,
    profilePicture: result.profilePicture,
    country: result.country,
    createdAt: result.createdAt,
  };

  let channel = await getChannel();

  await publishDirectMessage(
    channel,
    "jobber-buyer-update",
    "user-buyer",
    JSON.stringify(messageDetails),
    "Buyer details send to the buyer service"
  );

  return result;
};

module.exports = {
  createAuthUser,
};
