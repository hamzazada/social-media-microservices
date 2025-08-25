const { deleteMediaFromCloudinary } = require("../utils/cloudinary");
const logger = require("../utils/logger");

const handlePostDeleted = async (event) => {
  console.log(event, "eventevent");
  const { postId, mediaIds } = event;
  try {
    const mediaToDelete = await media.find({ _id: { $in: mediaIds } });
    for (const media of mediaToDelete) {
      await deleteMediaFromCloudinary(media.publicId);
      await media.findByIdAndDelete(media._id);

      logger.info(
        `Deleted media ${media._id} associated with this deletd post${postId}`
      );
    }
    logger.info(`processed deletion of media for post id ${postId}`);
  } catch (e) {
    logger.error("error occured while media deletion", e);
  }
};

module.exports = { handlePostDeleted };
