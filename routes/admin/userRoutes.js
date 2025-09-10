import express from "express";
import { deleteUser, getUsers } from "../../controller/admin/userController.js";
const router = express.Router();

router.get("/", getUsers);
// router.post("/", upload.array("images", 5), createProduct);
// router.put("/:id", updateProduct);
router.delete("/:id", deleteUser);

export default router;