import productModel from "../../model/productModel.js";
import userModel from "../../model/userModel.js";


export const generalData = async (req, res) => {
    try {
        const userCount = await userModel.countDocuments();
        const productCount = await productModel.countDocuments();

        res.status(200).json({
            success: true,
            status: 200,
            message: "Dashboard General Data fetched successfully",
            data: {
                totalUsers: userCount,
                totalProducts: productCount,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            status: 500,
            message: "Something went wrong",
            error: error.message,
        });
    }
};
