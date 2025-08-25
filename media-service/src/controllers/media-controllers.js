const { uploadMediaToCloudinary } = require("../utils/cloudinary");
const logger = require("../utils/logger");
const Media = require("../models/media");
const media = require("../models/media");

const uploadMedia = async (req, res) => {
  logger.info("starting media upload");
  try {
    if (!req.file) {
      logger.error("no file found. Please Add a file and try again");
      return res.status(404).json({
        success: false,
        message: "no file found. Please Add a file and try again",
      });
    }
    const { originalname, mimetype, buffer } = req.file;
    const userId = req.user.userId;

    logger.info(`File details : name=${originalname}, type=${mimetype}`);
    logger.info("uploading to cloudinary starting.....");

    const cloudinaryUploadResult = await uploadMediaToCloudinary(req.file);
    logger.info(
      `cloudinary upload successfully . public Id: - ${cloudinaryUploadResult.public_id} `
    );

    const newlyCreatedMedia = new Media({
      publicId: cloudinaryUploadResult.public_id,
      originalname,
      mimetype,
      url: cloudinaryUploadResult.secure_url,
      userId,
    });

    await newlyCreatedMedia.save();
    res.status(201).json({
      success: true,
      mediaId: newlyCreatedMedia._id,
      url: newlyCreatedMedia.url,
      message: "media upload successfully",
    });
  } catch (error) {
    logger.error("Error uploading  media ", error);
    res.status(500).json({
      success: false,
      message: "Error uploading  media",
    });
  }
};
const getAllMedias = async (req, res) => {
  try {
    results = await media.find({});
    res.json({ results });
  } catch (error) {
    logger.error("Error fetching  medias ", error);
    res.status(500).json({
      success: false,
      message: "Error fetching  medias",
    });
  }
};
module.exports = { uploadMedia, getAllMedias };
