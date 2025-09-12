import mongoose from "mongoose";
import slugify from "slugify";

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },
  slug: { type: String, unique: true },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    default: null, // null for root categories
  },
  icon: {
    type: String,
    default: "🛒", // default icon
  },
}, { timestamps: true });

// Middleware: auto-generate slug when saving
categorySchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = slugify(this.name, {
      lower: true,
      strict: true, // remove special chars like &, ?, etc.
    });
  }
  next();
});

// Virtual field for children (for nesting)
categorySchema.virtual("children", {
  ref: "Category",
  localField: "_id",
  foreignField: "parent",
  justOne: false,
});

categorySchema.set("toObject", { virtuals: true });
categorySchema.set("toJSON", { virtuals: true });

export default mongoose.model("Category", categorySchema);
