const express = require("express");
const buffer = require("buffer");
const multer = require("multer");

const {
  uploadMedia,
  getAllMedias,
} = require("../controllers/media-controllers");
const { authenticateRequest } = require("../middleware/auth-middleware");
const logger = require("../utils/logger");

const router = express.Router();

//configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limit: {
    fileSize: 5 * 1024 * 1025, // 5MB file
  },
}).single("file");

router.post(
  "/upload",
  authenticateRequest,
  (req, res, next) => {
    upload(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        logger.error("multer error while uploading:", err);
        return res.status(400).json({
          message: "multer error while uploading",
          error: err.message,
          stack: err.stack,
        });
      } else if (err) {
        logger.error("unknown error while uploading:", err);
        return res.status(500).json({
          message: "unknown error while uploading",
          error: err.message,
          stack: err.stack,
        });
      }
      if (!req.file) {
        return res.status(400).json({
          message: "no file found",
        });
      }
      next();
    });
  },
  uploadMedia
);
router.get("/get", authenticateRequest, getAllMedias);
module.exports = router;
