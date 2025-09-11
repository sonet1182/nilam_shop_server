import express from "express";
import { generalData } from "../../controller/admin/dashboardController.js";
const router = express.Router();

router.get("/general_data", generalData);

export default router;