import express from "express";
import {
  addBlog,
  deleteBlog,
  editBlog,
  getBlogById,
  getBlogBySlug,
  listBlogs,
  loginAdmin,
} from "../controllers/controller.js";
import upload from "../middleware/upload.js";

const router = express.Router();

// Admin Login
router.post("/login", loginAdmin);

// Blog Routes
router.post("/addblog", upload.single("featuredImage"), addBlog); // ✅ Add Blog with Image
router.get("/blogs", listBlogs); // ✅ List All Blogs
router.get("/blogs/:id", getBlogById); // ✅ Get Blog by Slug
router.put("/editblog/:id", upload.single("featuredImage"), editBlog); // ✅ Edit Blog with Optional Image
router.delete("/deleteblog/:id", deleteBlog); // ✅ Delete Blog & Remove Image from Cloudinary
router.get("/getslug/:slug", getBlogBySlug);

export default router;
