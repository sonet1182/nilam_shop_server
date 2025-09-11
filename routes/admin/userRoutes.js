import express from "express";
import { deleteUser, getUsers } from "../../controller/admin/userController.js";
const router = express.Router();

router.get("/", getUsers);
router.delete("/:id", deleteUser);


router.post("/:id/kickout", async (req, res) => {
  const userId = req.params.id;

  try {
    const io = req.app.get("io");
     io.to(`user_${userId}`).emit("forceLogout");
    res.json({ success: true, message: "User has been kicked out." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


export default router;