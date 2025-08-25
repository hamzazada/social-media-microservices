require("dotenv").config();

const cloudinary = require("cloudinary").v2;
const logger = require("../utils/logger");

cloudinary.config({
  cloud_name: "dznlzvfud" || process.env.CLOUDINARY_CLOUD_NAME,
  api_key: "226453245967962" || process.env.CLOUDINARY_SECRET_KEY,
  api_secret:
    "UzNnOU722l5jxTwyTDvkuVL-oI0" || process.env.CLOUDINARY_API_SECRET,
});

const uploadMediaToCloudinary = (file) => {
  return new Promise((resolve, reject) => {
    console.log(
      process.env.CLOUDINARY_CLOUD_NAME,
      process.env.CLOUDINARY_SECRET_KEY,
      process.env.CLOUDINARY_API_SECRET
    );
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "auto",
      },
      (error, result) => {
        if (error) {
          logger.error("Error while uploading media to cloudinary", error);
          reject(error);
        } else {
          resolve(result);
        }
      }
    );
    uploadStream.end(file.buffer);
  });
};
const deleteMediaFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    logger.info("media deleted from cloudinary storage successfully", publicId);
    return result;
  } catch (error) {
    logger.error("error deleting media from cloudinary", error);
    throw error;
  }
};
module.exports = { uploadMediaToCloudinary, deleteMediaFromCloudinary };
