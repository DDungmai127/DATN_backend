const { Store, Inventory, Product, sequelize } = require("../models");
const { Op } = require("sequelize");

// Lấy danh sách tất cả cửa hàng có phân trang và tìm kiếm
const getAllStores = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", status } = req.query;
    const offset = (page - 1) * parseInt(limit);

    // Xây dựng điều kiện tìm kiếm
    const whereCondition = {};

    // Thêm điều kiện tìm kiếm theo tên hoặc địa chỉ cửa hàng
    if (search) {
      whereCondition[Op.or] = [
        { storeName: { [Op.iLike]: `%${search}%` } },
        { storeAddress: { [Op.iLike]: `%${search}%` } },
        { storePhoneNumber: { [Op.iLike]: `%${search}%` } },
      ];
    }

    // Thêm điều kiện lọc theo trạng thái
    if (status && ["active", "inactive"].includes(status)) {
      whereCondition.status = status;
    }

    // Truy vấn cửa hàng
    const { count, rows: stores } = await Store.findAndCountAll({
      where: whereCondition,
      limit: parseInt(limit),
      offset: offset,
      order: [["createdAt", "DESC"]],
      attributes: [
        "storeId",
        "storeName",
        "storeAddress",
        "storePhoneNumber",
        "longitude",
        "latitude",
        "status",
        "createdAt",
        "updatedAt",
      ],
    });

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách cửa hàng thành công",
      data: stores,
      pagination: {
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Error getting stores:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách cửa hàng",
      error: error.message,
    });
  }
};

// Lấy thông tin chi tiết một cửa hàng
const getStoreById = async (req, res) => {
  try {
    const { storeId } = req.params;

    const store = await Store.findByPk(storeId);

    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy cửa hàng",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Lấy thông tin cửa hàng thành công",
      data: store,
    });
  } catch (error) {
    console.error("Error getting store:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thông tin cửa hàng",
      error: error.message,
    });
  }
};

// Tạo cửa hàng mới
const createStore = async (req, res) => {
  try {
    const {
      storeName,
      storeAddress,
      storePhoneNumber,
      longitude,
      latitude,
      status = "active",
    } = req.body;

    // Kiểm tra dữ liệu đầu vào
    if (!storeName || !storeAddress || !storePhoneNumber || !longitude || !latitude) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp đầy đủ thông tin cửa hàng",
      });
    }

    // Kiểm tra số điện thoại trùng lặp
    const existingStoreByPhone = await Store.findOne({
      where: { storePhoneNumber },
    });

    if (existingStoreByPhone) {
      return res.status(400).json({
        success: false,
        message: "Số điện thoại cửa hàng đã tồn tại",
      });
    }

    // Kiểm tra tên cửa hàng trùng lặp
    const existingStoreByName = await Store.findOne({
      where: { storeName },
    });

    if (existingStoreByName) {
      return res.status(400).json({
        success: false,
        message: "Tên cửa hàng đã tồn tại",
      });
    }

    // Tạo cửa hàng mới
    const newStore = await Store.create({
      storeName,
      storeAddress,
      storePhoneNumber,
      longitude,
      latitude,
      status,
    });

    return res.status(201).json({
      success: true,
      message: "Tạo cửa hàng mới thành công",
      data: newStore,
    });
  } catch (error) {
    console.error("Error creating store:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi tạo cửa hàng mới",
      error: error.message,
    });
  }
};

// Cập nhật thông tin cửa hàng
const updateStore = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { storeName, storeAddress, storePhoneNumber, longitude, latitude, status } = req.body;

    const store = await Store.findByPk(storeId);

    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy cửa hàng",
      });
    }

    // Kiểm tra số điện thoại trùng lặp nếu thay đổi
    if (storePhoneNumber && storePhoneNumber !== store.storePhoneNumber) {
      const existingStoreByPhone = await Store.findOne({
        where: {
          storePhoneNumber,
          storeId: { [Op.ne]: storeId },
        },
      });

      if (existingStoreByPhone) {
        return res.status(400).json({
          success: false,
          message: "Số điện thoại cửa hàng đã tồn tại",
        });
      }
    }

    // Kiểm tra tên cửa hàng trùng lặp nếu thay đổi
    if (storeName && storeName !== store.storeName) {
      const existingStoreByName = await Store.findOne({
        where: {
          storeName,
          storeId: { [Op.ne]: storeId },
        },
      });

      if (existingStoreByName) {
        return res.status(400).json({
          success: false,
          message: "Tên cửa hàng đã tồn tại",
        });
      }
    }

    // Cập nhật thông tin cửa hàng
    await store.update({
      storeName: storeName || store.storeName,
      storeAddress: storeAddress || store.storeAddress,
      storePhoneNumber: storePhoneNumber || store.storePhoneNumber,
      longitude: longitude || store.longitude,
      latitude: latitude || store.latitude,
      status: status || store.status,
    });

    return res.status(200).json({
      success: true,
      message: "Cập nhật thông tin cửa hàng thành công",
      data: store,
    });
  } catch (error) {
    console.error("Error updating store:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật thông tin cửa hàng",
      error: error.message,
    });
  }
};

// Xóa cửa hàng
const deleteStore = async (req, res) => {
  try {
    const { storeId } = req.params;

    const store = await Store.findByPk(storeId);

    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy cửa hàng",
      });
    }

    // Kiểm tra xem cửa hàng có đơn hàng không
    const orderCount = await store.countOrders();

    if (orderCount > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Không thể xóa cửa hàng vì có đơn hàng liên quan. Hãy cập nhật trạng thái thành 'inactive' thay vì xóa",
      });
    }

    // Xóa cửa hàng
    await store.destroy();

    return res.status(200).json({
      success: true,
      message: "Xóa cửa hàng thành công",
    });
  } catch (error) {
    console.error("Error deleting store:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi xóa cửa hàng",
      error: error.message,
    });
  }
};

// Lấy danh sách sản phẩm của cửa hàng
const getStoreProducts = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { page = 1, limit = 10, search = "" } = req.query;
    const offset = (page - 1) * parseInt(limit);

    // Kiểm tra cửa hàng tồn tại
    const store = await Store.findByPk(storeId);

    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy cửa hàng",
      });
    }

    // Xây dựng điều kiện tìm kiếm
    const whereCondition = { storeId };

    // Truy vấn tồn kho của cửa hàng với thông tin sản phẩm
    const { count, rows: inventoryItems } = await Inventory.findAndCountAll({
      where: whereCondition,
      limit: parseInt(limit),
      offset: offset,
      include: [
        {
          model: Product,
          as: "product",
          where: search
            ? {
                productName: { [Op.iLike]: `%${search}%` },
              }
            : {},
          required: true,
        },
      ],
      order: [["updatedAt", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách sản phẩm của cửa hàng thành công",
      data: inventoryItems,
      pagination: {
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        itemsPerPage: parseInt(limit),
      },
      store: {
        storeId: store.storeId,
        storeName: store.storeName,
      },
    });
  } catch (error) {
    console.error("Error getting store products:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách sản phẩm của cửa hàng",
      error: error.message,
    });
  }
};

// Lấy danh sách cửa hàng gần vị trí hiện tại
const getNearbyStores = async (req, res) => {
  try {
    const { latitude, longitude, radius = 10 } = req.query; // radius in kilometers

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp vị trí (latitude, longitude)",
      });
    }

    // Convert parameters to numbers
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const rad = parseFloat(radius);

    // Validate parameters
    if (isNaN(lat) || isNaN(lng) || isNaN(rad)) {
      return res.status(400).json({
        success: false,
        message: "Tham số không hợp lệ",
      });
    }

    // Calculate distance using Haversine formula (SQL version)
    const stores = await Store.findAll({
      attributes: {
        include: [
          [
            sequelize.literal(`
              6371 * acos(
                cos(radians(${lat})) * cos(radians(latitude)) * cos(radians(longitude) - radians(${lng}))
                + sin(radians(${lat})) * sin(radians(latitude))
              )
            `),
            "distance",
          ],
        ],
      },
      where: {
        status: "active",
        // Only include stores within the radius
        [Op.and]: sequelize.literal(`
          6371 * acos(
            cos(radians(${lat})) * cos(radians(latitude)) * cos(radians(longitude) - radians(${lng}))
            + sin(radians(${lat})) * sin(radians(latitude))
          ) <= ${rad}
        `),
      },
      order: sequelize.literal("distance ASC"),
    });

    return res.status(200).json({
      success: true,
      message: `Tìm thấy ${stores.length} cửa hàng trong bán kính ${radius}km`,
      data: stores,
    });
  } catch (error) {
    console.error("Error finding nearby stores:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi tìm kiếm cửa hàng gần đây",
      error: error.message,
    });
  }
};

// Đếm số lượng sản phẩm trong cửa hàng
const getStoreInventoryStats = async (req, res) => {
  try {
    const { storeId } = req.params;

    // Kiểm tra cửa hàng tồn tại
    const store = await Store.findByPk(storeId);

    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy cửa hàng",
      });
    }

    // Đếm tổng số sản phẩm
    const totalProducts = await Inventory.count({
      where: { storeId },
    });

    // Đếm số sản phẩm sắp hết (số lượng <= 10)
    const lowStockProducts = await Inventory.count({
      where: {
        storeId,
        quantity: { [Op.lte]: 10 },
      },
    });

    // Đếm số sản phẩm hết hàng (số lượng = 0)
    const outOfStockProducts = await Inventory.count({
      where: {
        storeId,
        quantity: 0,
      },
    });

    // Đếm số sản phẩm sắp hết hạn (trong vòng 30 ngày)
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const expiringProducts = await Inventory.count({
      where: {
        storeId,
        expirationDate: {
          [Op.not]: null,
          [Op.between]: [today, thirtyDaysFromNow],
        },
      },
    });

    // Đếm số sản phẩm đã hết hạn
    const expiredProducts = await Inventory.count({
      where: {
        storeId,
        expirationDate: {
          [Op.not]: null,
          [Op.lt]: today,
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Lấy thống kê tồn kho thành công",
      data: {
        totalProducts,
        lowStockProducts,
        outOfStockProducts,
        expiringProducts,
        expiredProducts,
      },
      store: {
        storeId: store.storeId,
        storeName: store.storeName,
      },
    });
  } catch (error) {
    console.error("Error getting store inventory stats:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thống kê tồn kho của cửa hàng",
      error: error.message,
    });
  }
};

// Cập nhật trạng thái cửa hàng (active/inactive)
const updateStoreStatus = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { status } = req.body;

    if (!status || !["active", "inactive"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái cửa hàng không hợp lệ",
      });
    }

    const store = await Store.findByPk(storeId);

    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy cửa hàng",
      });
    }

    await store.update({ status });

    return res.status(200).json({
      success: true,
      message: `Cập nhật trạng thái cửa hàng thành ${status === "active" ? "hoạt động" : "không hoạt động"}`,
      data: store,
    });
  } catch (error) {
    console.error("Error updating store status:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật trạng thái cửa hàng",
      error: error.message,
    });
  }
};

module.exports = {
  getAllStores,
  getStoreById,
  createStore,
  updateStore,
  deleteStore,
  getStoreProducts,
  getNearbyStores,
  getStoreInventoryStats,
  updateStoreStatus,
};
