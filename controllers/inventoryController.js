const { Inventory, Store, Product, sequelize } = require("../models");
const { Op } = require("sequelize");

// Lấy danh sách tất cả mục tồn kho (có phân trang và lọc)
const getAllInventory = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      storeId,
      productId,
      search = "",
      lowStock,
      expired,
      expiringSoon,
    } = req.query;

    const offset = (page - 1) * parseInt(limit);

    // Xây dựng điều kiện tìm kiếm
    const whereCondition = {};

    // Lọc theo cửa hàng
    if (storeId) {
      whereCondition.storeId = storeId;
    }

    // Lọc theo sản phẩm
    if (productId) {
      whereCondition.productId = productId;
    }

    // Lọc sản phẩm sắp hết (quantity <= 10)
    if (lowStock === "true") {
      whereCondition.quantity = {
        [Op.lte]: 10,
        [Op.gt]: 0, // Vẫn còn hàng
      };
    }

    // Lấy ngày hiện tại
    const today = new Date();

    // Lọc sản phẩm đã hết hạn
    if (expired === "true") {
      whereCondition.expirationDate = {
        [Op.lt]: today,
        [Op.ne]: null,
      };
    }

    // Lọc sản phẩm sắp hết hạn (trong vòng 30 ngày)
    if (expiringSoon === "true") {
      const thirtyDaysLater = new Date();
      thirtyDaysLater.setDate(today.getDate() + 30);

      whereCondition.expirationDate = {
        [Op.between]: [today, thirtyDaysLater],
        [Op.ne]: null,
      };
    }

    // Tạo các điều kiện tìm kiếm cho sản phẩm hoặc cửa hàng
    const productSearchCondition = search
      ? {
          productName: { [Op.iLike]: `%${search}%` },
        }
      : {};

    const storeSearchCondition = search
      ? {
          storeName: { [Op.iLike]: `%${search}%` },
        }
      : {};

    // Truy vấn tồn kho
    const { count, rows: inventoryItems } = await Inventory.findAndCountAll({
      where: whereCondition,
      limit: parseInt(limit),
      offset: offset,
      include: [
        {
          model: Product,
          as: "product",
          where: search ? productSearchCondition : {},
          required: !search || Object.keys(productSearchCondition).length > 0,
        },
        {
          model: Store,
          as: "store",
          where: search ? storeSearchCondition : {},
          required: !search || Object.keys(storeSearchCondition).length > 0,
        },
      ],
      order: [["updatedAt", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách tồn kho thành công",
      data: inventoryItems,
      pagination: {
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Error getting inventory:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách tồn kho",
      error: error.message,
    });
  }
};

// Lấy thông tin chi tiết một mục tồn kho
const getInventoryItem = async (req, res) => {
  try {
    const { storeId, productId } = req.params;

    const inventoryItem = await Inventory.findOne({
      where: { storeId, productId },
      include: [
        {
          model: Product,
          as: "product",
        },
        {
          model: Store,
          as: "store",
        },
      ],
    });

    if (!inventoryItem) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin tồn kho cho sản phẩm này",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Lấy thông tin tồn kho thành công",
      data: inventoryItem,
    });
  } catch (error) {
    console.error("Error getting inventory item:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thông tin tồn kho",
      error: error.message,
    });
  }
};

// Thêm sản phẩm vào kho
const addInventoryItem = async (req, res) => {
  try {
    const { storeId, productId, quantity, expirationDate } = req.body;

    // Kiểm tra dữ liệu đầu vào
    if (!storeId || !productId || quantity === undefined) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp đầy đủ thông tin (storeId, productId, quantity)",
      });
    }

    // Kiểm tra cửa hàng tồn tại
    const store = await Store.findByPk(storeId);
    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy cửa hàng",
      });
    }

    // Kiểm tra sản phẩm tồn tại
    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm",
      });
    }

    // Kiểm tra xem đã có mục tồn kho này chưa
    const existingItem = await Inventory.findOne({
      where: { storeId, productId },
    });

    if (existingItem) {
      return res.status(400).json({
        success: false,
        message:
          "Sản phẩm đã tồn tại trong kho của cửa hàng này. Vui lòng sử dụng chức năng cập nhật",
      });
    }

    // Tạo mục tồn kho mới
    const inventoryItem = await Inventory.create({
      storeId,
      productId,
      quantity: parseInt(quantity),
      expirationDate: expirationDate || null,
    });

    // Lấy thông tin chi tiết với join
    const createdItem = await Inventory.findOne({
      where: { storeId, productId },
      include: [
        { model: Product, as: "product" },
        { model: Store, as: "store" },
      ],
    });

    return res.status(201).json({
      success: true,
      message: "Thêm sản phẩm vào kho thành công",
      data: createdItem,
    });
  } catch (error) {
    console.error("Error adding inventory item:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi thêm sản phẩm vào kho",
      error: error.message,
    });
  }
};

// Cập nhật thông tin tồn kho
const updateInventoryItem = async (req, res) => {
  try {
    const { storeId, productId } = req.params;
    const { quantity, expirationDate } = req.body;

    // Kiểm tra dữ liệu đầu vào
    if (quantity === undefined && expirationDate === undefined) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp thông tin cần cập nhật (quantity hoặc expirationDate)",
      });
    }

    // Tìm mục tồn kho
    const inventoryItem = await Inventory.findOne({
      where: { storeId, productId },
    });

    if (!inventoryItem) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin tồn kho cho sản phẩm này",
      });
    }

    // Cập nhật thông tin
    const updateData = {};

    if (quantity !== undefined) {
      updateData.quantity = parseInt(quantity);
    }

    if (expirationDate !== undefined) {
      updateData.expirationDate = expirationDate || null;
    }

    await inventoryItem.update(updateData);

    // Lấy thông tin đã cập nhật với join
    const updatedItem = await Inventory.findOne({
      where: { storeId, productId },
      include: [
        { model: Product, as: "product" },
        { model: Store, as: "store" },
      ],
    });

    return res.status(200).json({
      success: true,
      message: "Cập nhật thông tin tồn kho thành công",
      data: updatedItem,
    });
  } catch (error) {
    console.error("Error updating inventory item:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật thông tin tồn kho",
      error: error.message,
    });
  }
};

// Xóa sản phẩm khỏi kho
const deleteInventoryItem = async (req, res) => {
  try {
    const { storeId, productId } = req.params;

    // Tìm mục tồn kho
    const inventoryItem = await Inventory.findOne({
      where: { storeId, productId },
    });

    if (!inventoryItem) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin tồn kho cho sản phẩm này",
      });
    }

    // Xóa mục tồn kho
    await inventoryItem.destroy();

    return res.status(200).json({
      success: true,
      message: "Xóa sản phẩm khỏi kho thành công",
    });
  } catch (error) {
    console.error("Error deleting inventory item:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi xóa sản phẩm khỏi kho",
      error: error.message,
    });
  }
};

// Nhận sản phẩm vào kho (tăng số lượng)
const receiveInventory = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { storeId, productId } = req.params;
    const { quantity, expirationDate } = req.body;

    // Kiểm tra dữ liệu đầu vào
    if (!quantity || parseInt(quantity) <= 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Số lượng nhận phải lớn hơn 0",
      });
    }

    // Tìm mục tồn kho
    const inventoryItem = await Inventory.findOne({
      where: { storeId, productId },
      transaction,
    });

    if (!inventoryItem) {
      // Nếu sản phẩm chưa có trong kho, kiểm tra xem cửa hàng và sản phẩm có tồn tại không
      const store = await Store.findByPk(storeId, { transaction });
      if (!store) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy cửa hàng",
        });
      }

      const product = await Product.findByPk(productId, { transaction });
      if (!product) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy sản phẩm",
        });
      }

      // Tạo mục tồn kho mới
      await Inventory.create(
        {
          storeId,
          productId,
          quantity: parseInt(quantity),
          expirationDate: expirationDate || null,
        },
        { transaction }
      );
    } else {
      // Cập nhật số lượng
      const newQuantity = inventoryItem.quantity + parseInt(quantity);
      await inventoryItem.update(
        {
          quantity: newQuantity,
          expirationDate: expirationDate || inventoryItem.expirationDate,
        },
        { transaction }
      );
    }

    // Cập nhật tổng số lượng sản phẩm (nếu cần)
    const product = await Product.findByPk(productId, { transaction });
    await product.update(
      {
        quantity: sequelize.literal(`quantity + ${parseInt(quantity)}`),
      },
      { transaction }
    );

    await transaction.commit();

    // Lấy thông tin đã cập nhật
    const updatedItem = await Inventory.findOne({
      where: { storeId, productId },
      include: [
        { model: Product, as: "product" },
        { model: Store, as: "store" },
      ],
    });

    return res.status(200).json({
      success: true,
      message: "Nhận sản phẩm vào kho thành công",
      data: updatedItem,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error receiving inventory:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi nhận sản phẩm vào kho",
      error: error.message,
    });
  }
};

// Chuyển sản phẩm giữa các kho
const transferInventory = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { sourceStoreId, destinationStoreId, productId, quantity, expirationDate } = req.body;

    // Kiểm tra dữ liệu đầu vào
    if (!sourceStoreId || !destinationStoreId || !productId || !quantity) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message:
          "Vui lòng cung cấp đầy đủ thông tin (sourceStoreId, destinationStoreId, productId, quantity)",
      });
    }

    if (sourceStoreId === destinationStoreId) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Cửa hàng nguồn và đích không thể giống nhau",
      });
    }

    if (parseInt(quantity) <= 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Số lượng chuyển phải lớn hơn 0",
      });
    }

    // Kiểm tra cửa hàng nguồn và đích tồn tại
    const sourceStore = await Store.findByPk(sourceStoreId, { transaction });
    const destinationStore = await Store.findByPk(destinationStoreId, { transaction });

    if (!sourceStore || !destinationStore) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy cửa hàng nguồn hoặc đích",
      });
    }

    // Kiểm tra sản phẩm tồn tại
    const product = await Product.findByPk(productId, { transaction });
    if (!product) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm",
      });
    }

    // Kiểm tra tồn kho tại cửa hàng nguồn
    const sourceInventory = await Inventory.findOne({
      where: { storeId: sourceStoreId, productId },
      transaction,
    });

    if (!sourceInventory || sourceInventory.quantity < parseInt(quantity)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Số lượng tồn kho không đủ để chuyển",
      });
    }

    // Giảm số lượng tại cửa hàng nguồn
    await sourceInventory.update(
      {
        quantity: sourceInventory.quantity - parseInt(quantity),
      },
      { transaction }
    );

    // Tăng hoặc tạo mới tồn kho tại cửa hàng đích
    const destinationInventory = await Inventory.findOne({
      where: { storeId: destinationStoreId, productId },
      transaction,
    });

    if (destinationInventory) {
      // Cập nhật số lượng
      await destinationInventory.update(
        {
          quantity: destinationInventory.quantity + parseInt(quantity),
          expirationDate: expirationDate || destinationInventory.expirationDate,
        },
        { transaction }
      );
    } else {
      // Tạo mới
      await Inventory.create(
        {
          storeId: destinationStoreId,
          productId,
          quantity: parseInt(quantity),
          expirationDate: expirationDate || sourceInventory.expirationDate,
        },
        { transaction }
      );
    }

    await transaction.commit();

    // Lấy thông tin đã cập nhật
    const updatedSourceInventory = await Inventory.findOne({
      where: { storeId: sourceStoreId, productId },
      include: [{ model: Product, as: "product" }],
    });

    const updatedDestinationInventory = await Inventory.findOne({
      where: { storeId: destinationStoreId, productId },
      include: [{ model: Product, as: "product" }],
    });

    return res.status(200).json({
      success: true,
      message: "Chuyển sản phẩm giữa các kho thành công",
      data: {
        source: updatedSourceInventory,
        destination: updatedDestinationInventory,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error transferring inventory:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi chuyển sản phẩm giữa các kho",
      error: error.message,
    });
  }
};

// Lấy thống kê tồn kho tổng thể
const getInventoryStatistics = async (req, res) => {
  try {
    // Tổng số sản phẩm trong tồn kho
    const totalItems = await Inventory.sum("quantity");

    // Số lượng mục tồn kho
    const totalInventoryRecords = await Inventory.count();

    // Số lượng cửa hàng có tồn kho
    const storesWithInventory = await Inventory.count({
      distinct: true,
      col: "storeId",
    });

    // Số lượng sản phẩm có tồn kho
    const productsInInventory = await Inventory.count({
      distinct: true,
      col: "productId",
    });

    // Sản phẩm sắp hết hàng (số lượng <= 10)
    const lowStockItems = await Inventory.count({
      where: {
        quantity: { [Op.gt]: 0, [Op.lte]: 10 },
      },
    });

    // Sản phẩm hết hàng
    const outOfStockItems = await Inventory.count({
      where: {
        quantity: 0,
      },
    });

    // Sản phẩm sắp hết hạn trong 30 ngày
    const today = new Date();
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(today.getDate() + 30);

    const expiringItems = await Inventory.count({
      where: {
        expirationDate: {
          [Op.ne]: null,
          [Op.between]: [today, thirtyDaysLater],
        },
      },
    });

    // Sản phẩm đã hết hạn
    const expiredItems = await Inventory.count({
      where: {
        expirationDate: {
          [Op.ne]: null,
          [Op.lt]: today,
        },
      },
    });

    // Top 5 sản phẩm có nhiều tồn kho nhất
    const topProducts = await Inventory.findAll({
      attributes: [
        "productId",
        [sequelize.fn("SUM", sequelize.col("Inventory.quantity")), "totalQuantity"],
      ],
      include: [
        {
          model: Product,
          as: "product",
          attributes: ["productName"],
        },
      ],
      group: ["productId", "product.productId"],
      order: [[sequelize.fn("SUM", sequelize.col("Inventory.quantity")), "DESC"]],
      limit: 5,
    });

    return res.status(200).json({
      success: true,
      message: "Lấy thông kê tồn kho thành công",
      data: {
        totalItems,
        totalInventoryRecords,
        storesWithInventory,
        productsInInventory,
        lowStockItems,
        outOfStockItems,
        expiringItems,
        expiredItems,
        topProducts: topProducts.map((item) => ({
          productId: item.productId,
          productName: item.product.productName,
          totalQuantity: parseInt(item.get("totalQuantity")),
        })),
      },
    });
  } catch (error) {
    console.error("Error getting inventory statistics:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thống kê tồn kho",
      error: error.message,
    });
  }
};

// Xuất báo cáo tồn kho
const exportInventoryReport = async (req, res) => {
  try {
    const { storeId, lowStock, expired } = req.query;

    // Xây dựng điều kiện tìm kiếm
    const whereCondition = {};

    // Lọc theo cửa hàng
    if (storeId) {
      whereCondition.storeId = storeId;
    }

    // Lọc sản phẩm sắp hết (quantity <= 10)
    if (lowStock === "true") {
      whereCondition.quantity = {
        [Op.lte]: 10,
        [Op.gt]: 0, // Vẫn còn hàng
      };
    }

    // Lấy ngày hiện tại
    const today = new Date();

    // Lọc sản phẩm đã hết hạn
    if (expired === "true") {
      whereCondition.expirationDate = {
        [Op.lt]: today,
        [Op.ne]: null,
      };
    }

    // Truy vấn tồn kho
    const inventoryItems = await Inventory.findAll({
      where: whereCondition,
      include: [
        { model: Product, as: "product" },
        { model: Store, as: "store" },
      ],
      order: [
        ["storeId", "ASC"],
        ["quantity", "ASC"],
      ],
    });

    // Định dạng dữ liệu báo cáo
    const reportData = inventoryItems.map((item) => ({
      storeId: item.storeId,
      storeName: item.store.storeName,
      productId: item.productId,
      productName: item.product.productName,
      quantity: item.quantity,
      unitOfMeasurement: item.product.unitOfMeasurement,
      expirationDate: item.expirationDate
        ? new Date(item.expirationDate).toLocaleDateString("vi-VN")
        : "N/A",
      status: item.quantity === 0 ? "Hết hàng" : item.quantity <= 10 ? "Sắp hết hàng" : "Còn hàng",
      lastUpdated: new Date(item.updatedAt).toLocaleDateString("vi-VN"),
    }));

    // Thông tin tổng hợp
    const summary = {
      totalItems: reportData.length,
      totalQuantity: reportData.reduce((sum, item) => sum + item.quantity, 0),
      lowStockItems: reportData.filter((item) => item.quantity <= 10 && item.quantity > 0).length,
      outOfStockItems: reportData.filter((item) => item.quantity === 0).length,
      generatedAt: new Date().toLocaleString("vi-VN"),
    };

    return res.status(200).json({
      success: true,
      message: "Xuất báo cáo tồn kho thành công",
      data: {
        summary,
        details: reportData,
      },
    });
  } catch (error) {
    console.error("Error exporting inventory report:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi xuất báo cáo tồn kho",
      error: error.message,
    });
  }
};

module.exports = {
  getAllInventory,
  getInventoryItem,
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  receiveInventory,
  transferInventory,
  getInventoryStatistics,
  exportInventoryReport,
};
