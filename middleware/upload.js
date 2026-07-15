const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const multer = require("multer");

const UPLOAD_ROOT = path.join(__dirname, "..", "uploads");
const SAMPLES_DIR = path.join(UPLOAD_ROOT, "samples");

fs.mkdirSync(SAMPLES_DIR, { recursive: true });

// mimetype -> canonical extension. Anything not listed here is rejected.
const ALLOWED_TYPES = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "application/pdf": ".pdf",
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB per file
const MAX_FILES = 8; // per service listing

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, SAMPLES_DIR),
  filename: (req, file, cb) => {
    // Never trust the client filename on disk — generate our own.
    const ext = ALLOWED_TYPES[file.mimetype] || "";
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_TYPES[file.mimetype]) {
    return cb(
      new Error("Only JPG, PNG, WEBP, GIF or PDF work samples are allowed"),
    );
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
});

// Wraps the multer middleware so limit/type errors come back as clean 400 JSON
// instead of falling through to the generic 500 error handler.
const uploadSamples = (req, res, next) => {
  upload.array("samples", MAX_FILES)(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "Each file must be 5MB or smaller" });
      }
      if (err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE") {
        return res
          .status(400)
          .json({ message: `You can upload at most ${MAX_FILES} work samples` });
      }
      return res.status(400).json({ message: err.message });
    }
    return res.status(400).json({ message: err.message });
  });
};

/**
 * Deletes a previously uploaded sample from disk.
 * Only ever touches files that resolve to inside uploads/samples, so a crafted
 * url like "/uploads/samples/../../.env" can't escape the directory.
 */
const removeSampleFile = (url) => {
  if (typeof url !== "string" || !url.startsWith("/uploads/samples/")) return;

  const target = path.resolve(UPLOAD_ROOT, `.${url.replace("/uploads", "")}`);
  const relative = path.relative(SAMPLES_DIR, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return;

  fs.promises.unlink(target).catch(() => {
    /* already gone — nothing to do */
  });
};

module.exports = {
  uploadSamples,
  removeSampleFile,
  UPLOAD_ROOT,
  SAMPLES_DIR,
  MAX_FILES,
  ALLOWED_TYPES,
};
