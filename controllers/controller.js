import { v2 as cloudinary } from "cloudinary";
import jwt from 'jsonwebtoken';
import  Blog  from "../models/blog.js";


// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});


export const loginAdmin = async (req, res,next) => {
  const { email, password } = req.body;

  // Fetch credentials from environment variables
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  const JWT_SECRET = process.env.JWT_SECRET;

  // Validate environment variables
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !JWT_SECRET) {
    return res.status(500).json({ success: false, message: "Server configuration error" });
  }

  try {
    // Validate credentials
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      // Generate JWT token
        const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "2d" }); // Token valid for 2 days

      // Send success response
      return res.status(200).json({ success: true, message: "Login successful", token });
    } else {
      // Send error response for invalid credentials
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }
  } catch (error) {
    next(error);
  }
}



// ✅ Add Blog (with Image Upload)
// ✅ Add Blog (with Image Upload & Updated Schema)
export const addBlog = async (req, res, next) => {
    try {
      const { title, description } = req.body;
  
      if (!req.file) {
        return res.status(400).json({ error: "No image uploaded" });
      }
  
      // ✅ Upload image to Cloudinary
      const uploadResult = await new Promise((resolve, reject) => {
        const upload = cloudinary.uploader.upload_stream(
          { folder: "blogs" }, // Stores inside "blogs/" folder
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          }
        );
        upload.end(req.file.buffer); // Pass file buffer to Cloudinary
      });
  
      // ✅ Save the blog in MongoDB
      const newBlog = new Blog({
        title,
        description,
        featuredImage: uploadResult.secure_url, // Store image URL
      });
  
      await newBlog.save();
  
      res.status(201).json({ success: true, message: "Blog added successfully", blog: newBlog });
    } catch (error) {
      console.log(error);
      next(error);
    }
  };
  
  
  
  
  
  // ✅ Edit Blog (with Optional Image Upload)
  export const editBlog = async (req, res, next) => {
    try {
      const { title, slug, description } = req.body;
  
      // ✅ Validate required fields
      if (!title || !slug || !description) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
      }
  
      // ✅ Find the blog by ID
      const blog = await Blog.findById(req.params.id);
      if (!blog) {
        return res.status(404).json({ success: false, message: "Blog not found" });
      }
  
      let imageUrl = blog.featuredImage; // Keep old image by default
  
      // ✅ Handle image upload if a new file is provided
      if (req.file) {
        try {
          // ✅ Delete old Cloudinary image
          const oldPublicId = blog.featuredImage.split("/").pop().split(".")[0];
          await cloudinary.uploader.destroy(`blogs/${oldPublicId}`);
  
          // ✅ Upload new image to Cloudinary
          const uploadResult = await new Promise((resolve, reject) => {
            const upload = cloudinary.uploader.upload_stream(
              { folder: "blogs" },
              (error, result) => (error ? reject(error) : resolve(result))
            );
            upload.end(req.file.buffer);
          });
  
          imageUrl = uploadResult.secure_url; // Update image URL
        } catch (error) {
          return res.status(500).json({ success: false, message: "Error updating image" });
        }
      }
  
      // ✅ Update the blog
      const updatedBlog = await Blog.findByIdAndUpdate(
        req.params.id,
        { title, slug, description, featuredImage: imageUrl },
        { new: true, runValidators: true }
      );
  
      res.status(200).json({ success: true, message: "Blog updated successfully", updatedBlog });
    } catch (error) {
      next(error);
    }
  };
  
  
  
  export const deleteBlog = async (req, res, next) => {
    try {
      const blog = await Blog.findById(req.params.id);
      if (!blog) {
        return res.status(404).json({ success: false, message: "Blog not found" });
      }
  
      // ✅ Extract Public ID from Cloudinary URL (handles nested folders)
      const imageUrl = blog.featuredImage;
      const publicId = imageUrl.split("/").slice(-2).join("/").split(".")[0]; // Extract correct ID
      let cloudinaryError = null;
  
      // ✅ Delete image from Cloudinary (folder path included)
      try {
        await cloudinary.uploader.destroy(publicId);
      } catch (error) {
        cloudinaryError = "Failed to delete image from Cloudinary";
      }
  
      // ✅ Delete blog from MongoDB
      await Blog.findByIdAndDelete(req.params.id);
  
      // ✅ Send response based on Cloudinary deletion status
      if (cloudinaryError) {
        return res.status(200).json({
          success: true,
          message: "Blog deleted successfully, but image deletion failed",
          warning: cloudinaryError,
        });
      } else {
        return res.status(200).json({ success: true, message: "Blog deleted successfully" });
      }
    } catch (error) {
      next(error); // Pass the error to the error-handling middleware
    }
  };

  // ✅ Get Blog by Slug
export const getBlogBySlug = async (req, res, next) => {
    try {
      const blog = await Blog.findOne({ slug: req.params.slug });    
      if (!blog) {
        return res.status(404).json({ success: false, message: "Blog not found" });
      }
      res.status(200).json( blog );
    } catch (error) {
      next(error); // Pass the error to the error-handling middleware
    }
  };
  
  
  // ✅ Get Blog by ID
  export const getBlogById = async (req, res, next) => {
    try {
      const blog = await Blog.findOne({ _id: req.params.id });
      if (!blog) {
        return res.status(404).json({ success: false, message: "Blog not found" });
      }
  
      res.status(200).json({ success: true, blog });
    } catch (error) {
      next(error); // Pass the error to the error-handling middleware
    }
  };
  
  // ✅ List Blogs (with Pagination)
  export const listBlogs = async (req, res, next) => {
    try {    
      const page = parseInt(req.query.page) || 1; // Default to page 1
      const limit = parseInt(req.query.limit) || 10; // Default to 10 blogs per page
      const search = req.query.search || ""; // Get search query
      const skip = (page - 1) * limit;
  
      // Search Query - Case-insensitive search on title and content
      const searchQuery = search
        ? { $or: [{ title: { $regex: search, $options: "i" } }, { "content.data": { $regex: search, $options: "i" } }] }
        : {};
  
      // Fetch blogs with search and pagination
      const blogs = await Blog.find(searchQuery)
        .sort({ publishedDate: -1 }) // Sort by latest first
        .skip(skip)
        .limit(limit)
        .lean(); // Using `.lean()` for faster performance
  
      const totalBlogs = await Blog.countDocuments(searchQuery); // Total blogs after filtering
  
      res.status(200).json({
        success: true,
        blogs,
        pagination: {
          page,
          limit,
          total: totalBlogs,
          totalPages: Math.ceil(totalBlogs / limit),
        },
      });
    } catch (error) {
      next(error); // Pass the error to the error-handling middleware
    }
  };
  