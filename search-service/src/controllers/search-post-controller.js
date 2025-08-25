const searchPostController = async (req, res) => {
  logger.info("search endpoint hit!");
  try {
    const { query } = req.query;
    const result = await Search.find(
      {
        $text: { $search: query },
      },
      {
        score: { $meta: "textScore" },
      }
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(10);

    res.json(result);
  } catch (error) {
    logger.error("Error fetching post", error);
    res.status(500).json({
      success: false,
      message: "Error fetching post",
    });
  }
};
module.exports = { searchPostController };
