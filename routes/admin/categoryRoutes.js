import express from "express";
import {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
  updateSlugs,
} from "../../controller/admin/categoryController.js";

const router = express.Router();

router.post("/update-slugs", updateSlugs);
router.post("/", createCategory);
router.get("/", getCategories);
router.put("/:id", updateCategory);
router.delete("/:id", deleteCategory);

export default router;
