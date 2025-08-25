const mongoose = require("mongoose");
const { applyTimestamps } = require("../../../post-service/src/models/post");

const searchPostSchema = new mongoose.Schema(
  {
    postId: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);
searchPostSchema.index({ content: "text" });
searchPostSchema.index({ createdAt: -1 });

const search = mongoose.model("search", searchPostSchema);
module.exports = search;
