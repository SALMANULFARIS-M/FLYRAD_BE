import mongoose from "mongoose";
import slugify from "slugify";

const BlogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, unique: true },
    featuredImage: {
      type: String,
      required: true,
      validate: {
        validator: (value) => /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/.test(value),
        message: "Featured image must be a valid URL.",
      },
    },
    publishedDate: { type: Date, default: Date.now },
    description: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

// Generate unique slug
async function generateUniqueSlug(title, model) {
  let slug = slugify(title, { lower: true, strict: true });

  if (slug.length > 50) {
    slug = slug.substring(0, 50).replace(/-$/, "");
  }

  const regex = new RegExp(`^${slug}(-\\d+)?$`, "i");
  const existingCount = await model.countDocuments({ slug: regex });

  return existingCount === 0 ? slug : `${slug}-${existingCount + 1}`;
}

// Auto-generate slug before saving
BlogSchema.pre("save", async function (next) {
  if (!this.slug) {
    try {
      this.slug = await generateUniqueSlug(this.title, mongoose.model("Blog"));
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Ensure unique slug if duplicates
BlogSchema.post("save", async function (doc, next) {
  const existingCount = await mongoose.model("Blog").countDocuments({ slug: doc.slug });

  if (existingCount > 1 && !doc.slug.endsWith(`-${existingCount}`)) {
    doc.slug = `${doc.slug}-${existingCount}`;
    await doc.save();
  }
  next();
});

// Indexes
BlogSchema.index({ title: 1 });
BlogSchema.index({ publishedDate: -1 });

// Virtuals
BlogSchema.virtual("shortDescription").get(function () {
  return this.description ? this.description.substring(0, 100) : "";
});

BlogSchema.virtual("formattedDate").get(function () {
  return this.publishedDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
});

// Prevent recompiling the model
if (!mongoose.models.Blog) {
  mongoose.model("Blog", BlogSchema);
}

const Blog = mongoose.model("Blog");
export default Blog;
