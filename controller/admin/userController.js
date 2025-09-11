import userModel from "../../model/userModel.js";

export const getUsers = async (req, res) => {
    try {
        // Get page & limit from query params (default: page=1, limit=10)
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || "";

        let query = {};
        // search filter (merge with existing query)
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { phone: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
            ];
        }

        // Calculate how many documents to skip
        const skip = (page - 1) * limit;

        // Fetch users with pagination
        const users = await userModel.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .exec();

        // ✅ Count only filtered users
        const total = await userModel.countDocuments(query);
        const totalPages = Math.ceil(total / limit);

        // Build page links (preserve search param if present)
        const baseUrl = `${req.protocol}://${req.get("host")}${req.baseUrl}${req.path}`;
        const queryParam = search ? `&search=${encodeURIComponent(search)}` : "";

        const links = {
            self: `${baseUrl}?page=${page}&limit=${limit}${queryParam}`,
            first: `${baseUrl}?page=1&limit=${limit}${queryParam}`,
            last: `${baseUrl}?page=${totalPages}&limit=${limit}${queryParam}`,
            prev: page > 1 ? `${baseUrl}?page=${page - 1}&limit=${limit}${queryParam}` : null,
            next: page < totalPages ? `${baseUrl}?page=${page + 1}&limit=${limit}${queryParam}` : null,
            current_page: page,
        };

        const formattedUsers = users.map((user) => ({
            id: user._id,
            name: user.name,
            phone: user.phone,
            email: user.email,
            role: user.role ?? "user",
            address: user.address,
            image: user.image,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        }));

        res.status(200).json({
            total,
            page,
            totalPages,
            links,
            data: formattedUsers,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteUser = async (req, res) => {
    try {
        const user = await userModel.findOneAndDelete({ _id: req.params.id });
        if (!user) return res.status(404).json({ message: "User not found" });

        res.status(200).json({
            success: true,
            status: 200,
            message: "User Removed successfully",
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
