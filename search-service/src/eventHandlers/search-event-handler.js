const { search } = require("../routes/search-routes");
const logger = require("../utils/logger");

async function handlePostCreated(event) {
  try {
    const newSearchPost = new search({
      postId: event.postId,
      userId: event.user,
      content: event.content,
      createdAt: event.createdAt,
    });
    await newSearchPost.save();
    logger.info(
      `Search post Created : ${event.postId}, ${newSearchPost._id.toString()}`
    );
  } catch (e) {
    logger.error(e, "Error handling post Creation");
  }
}
async function handlePostDeleted(event) {
  try {
    await search.findOneAndDelete({ postId: event.postId });
    logger.info(`Search post Deleted : ${event.postId}`);
  } catch (error) {
    logger.error(error, "Error handling post deletion");
  }
}
module.exports = { handlePostCreated, handlePostDeleted };
