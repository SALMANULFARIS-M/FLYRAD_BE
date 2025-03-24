import multer from "multer";

// Multer storage configuration (MemoryStorage for Cloudinary, change if needed)
const storage = multer.memoryStorage();

// File filter to allow only specific types (optional)
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true); // Accept the file
  } else {
    cb(new Error("Only image files are allowed!"), false); // Reject file
  }
};

// Initialize Multer
const upload = multer({ storage, fileFilter });

export default upload;
