const logger = require("../utils/logger");
const { validateCreatePost } = require("../utils/validation");
const Post = require("../models/post");
const { connectToRabbitMq, publishEvent } = require("../utils/rabbitmq");

async function invalidatePostCache(req, input) {
  const cachedKey = `post:${input}`;
  await req.redisClient.del(cachedKey);
  const keys = await req.redisClient.keys("posts:*");
  if (keys.length > 0) {
    await req.redisClient.del(keys);
  }
}

const createPost = async (req, res) => {
  logger.info("create post endpoint hit");
  try {
    const { error } = validateCreatePost(req.body);
    if (error) {
      logger.warn("Validation error", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }
    const { content, mediaIds } = req.body;
    const newlyCreatedPost = new Post({
      user: req.user.userId,
      content,
      mediaIds: mediaIds || [],
    });
    await newlyCreatedPost.save();

    await publishEvent("post.created", {
      postId: newlyCreatedPost._id.toString(),
      userId: newlyCreatedPost.user.toString(),
      content: newlyCreatedPost.content,
      createdAt: newlyCreatedPost.createdAt,
    });

    await invalidatePostCache(req, newlyCreatedPost._id.toString());
    logger.info("post created Successfully", newlyCreatedPost);
    res.status(201).json({
      success: true,
      message: "post created Successfully",
    });
  } catch (error) {
    logger.error("Error creating post", error);
    res.status(500).json({
      success: false,
      message: "Error creating post",
    });
  }
};

const getAllPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;

    const cacheKey = `posts:${page}:${limit}`;
    const cachedPost = await req.redisClient.get(cacheKey);
    if (cachedPost) {
      return res.json(JSON.parse(cachedPost));
    }
    const post = await Post.find({})
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    const totalNoOfPosts = await Post.countDocuments();

    const result = {
      post,
      currentpage: page,
      totalpages: Math.ceil(totalNoOfPosts / limit),
      totalposts: totalNoOfPosts,
    };
    //save your post in redis cache
    await req.redisClient.setex(cacheKey, 300, JSON.stringify(result));
    res.json(result);
  } catch (error) {
    logger.error("Error fetching post", error);
    res.status(500).json({
      success: false,
      message: "Error fetching post",
    });
  }
};

const getPost = async (req, res) => {
  try {
    const postId = req.params.id;
    const cacheKey = `post:${postId}`;
    const cachedPost = await req.redisClient.get(cacheKey);
    if (cachedPost) {
      return res.json(JSON.parse(cachedPost));
    }
    const singlePostById = await Post.findById(postId);

    if (!singlePostById) {
      return res.status(404).json({
        success: false,
        message: "post not found",
      });
    }
    await req.redisClient.setex(cacheKey, 3600, JSON.stringify(singlePostById));
    res.json(singlePostById);
  } catch (error) {
    logger.error("Error fetching post", error);
    res.status(500).json({
      success: false,
      message: "Error fetching post by ID",
    });
  }
};

const deletePost = async (req, res) => {
  try {
    const post = await Post.findOneAndDelete({
      _id: req.params.id,
      user: req.user.userId,
    });
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "post not found",
      });
    }
    //publish post delete method
    await publishEvent("post.deleted", {
      postId: post._id.toString(),
      userId: req.user.userId,
      mediaIds: post.mediaIds,
    });
    await invalidatePostCache(req, req.params.id);
    res.json({
      message: "post Deleted Successfully",
    });
  } catch (error) {
    logger.error("Error deleting post", error);
    res.status(500).json({
      success: false,
      message: "Error Deleting post",
    });
  }
};

module.exports = { createPost, getAllPosts, getPost, deletePost };
