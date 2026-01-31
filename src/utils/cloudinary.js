// utils/cloudinary.js
const cloudinary = require("cloudinary").v2;
const config = require("../config/server-config");

cloudinary.config({
  cloud_name: config.CLOUD_NAME,
  api_key: config.CLOUD_API_KEY,
  api_secret: config.CLOUD_API_SECRET,
});

const generateUploadSignature = () => {
  const timestamp = Math.round(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder: "profiles" },
    config.CLOUD_API_KEY,
  );

  return { timestamp, signature };
};

module.exports = { generateUploadSignature };
