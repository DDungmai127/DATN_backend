const { Order, OrderItem, Product, User, Store, sequelize } = require("../models"); // Thêm Store vào models
const { Op } = require("sequelize");

/**
 * Tạo đơn hàng mới từ thông tin giỏ hàng
 */
const createOrder = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      customerName,
      phoneNumber,
      address,
      deliveryDay,
      deliveryTime,
      paymentMethod,
      orderItems,
      storeId, // Thêm storeId vào request
    } = req.body;

    // Lấy userId nếu người dùng đã đăng nhập
    const userId = req.user?.userId || null;

    // Kiểm tra dữ liệu đầu vào
    if (
      !customerName ||
      !phoneNumber ||
      !address ||
      !deliveryDay ||
      !deliveryTime ||
      !paymentMethod
    ) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp đầy đủ thông tin đặt hàng",
      });
    }

    if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Giỏ hàng trống, vui lòng thêm sản phẩm vào giỏ hàng",
      });
    }

    // Kiểm tra storeId (nếu không có, có thể chọn cửa hàng gần nhất)
    let selectedStoreId = storeId;
    if (!selectedStoreId) {
      // Tìm cửa hàng gần nhất với địa chỉ giao hàng
      // Đây chỉ là mã giả, bạn cần thực hiện API để tìm cửa hàng gần nhất
      const nearestStore = await findNearestStore(address);
      if (nearestStore) {
        selectedStoreId = nearestStore.storeId;
      }
    }

    // Nếu vẫn không có storeId, sử dụng cửa hàng mặc định (nếu có)
    if (!selectedStoreId) {
      const defaultStore = await Store.findOne({ where: { isDefault: true } });
      if (defaultStore) {
        selectedStoreId = defaultStore.storeId;
      }
    }

    // Kiểm tra số lượng tồn kho của từng sản phẩm
    const productIds = orderItems.map((item) => item.productId);
    const products = await Product.findAll({
      where: { productId: { [Op.in]: productIds } },
      attributes: ["productId", "productName", "quantity", "price"],
      transaction,
    });

    // Tạo map sản phẩm để dễ kiểm tra
    const productMap = {};
    products.forEach((product) => {
      productMap[product.productId] = product;
    });

    // Kiểm tra số lượng và tính toán tổng tiền
    let totalAmount = 0;
    const validatedItems = [];

    for (const item of orderItems) {
      const product = productMap[item.productId];

      // Nếu sản phẩm không tồn tại
      if (!product) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Sản phẩm không tồn tại hoặc đã bị xóa`,
        });
      }

      // Kiểm tra số lượng
      if (item.quantity > product.quantity) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Sản phẩm '${product.productName}' chỉ còn ${product.quantity} trong kho`,
        });
      }

      // Tính giá cuối cùng (có thể áp dụng giảm giá nếu cần)
      const price = product.price;
      const amount = price * item.quantity;
      totalAmount += amount;

      validatedItems.push({
        productId: item.productId,
        orderQuantity: item.quantity,
        price: price,
        amount: amount,
        productName: product.productName,
      });
    }

    // Tạo đơn hàng mới với storeId
    const order = await Order.create(
      {
        userId,
        storeId: selectedStoreId, // Thêm storeId vào đơn hàng
        customerName,
        phoneNumber,
        address,
        deliveryDay,
        deliveryTime,
        paymentMethod,
        status: "Chờ xử lý",
      },
      { transaction }
    );

    // Tạo chi tiết đơn hàng
    const orderItemsToCreate = validatedItems.map((item) => ({
      orderId: order.orderId,
      productId: item.productId,
      productName: item.productName,
      orderQuantity: item.orderQuantity,
      price: item.price,
      amount: item.amount,
    }));

    await OrderItem.bulkCreate(orderItemsToCreate, { transaction });

    // Cập nhật số lượng tồn kho sản phẩm
    for (const item of validatedItems) {
      await Product.decrement("quantity", {
        by: item.orderQuantity,
        where: { productId: item.productId },
        transaction,
      });
    }

    // Commit transaction
    await transaction.commit();

    return res.status(201).json({
      success: true,
      message: "Đặt hàng thành công",
      data: {
        orderId: order.orderId,
        displayId: order.displayId,
      },
    });
  } catch (error) {
    // Rollback transaction nếu có lỗi
    if (transaction) await transaction.rollback();

    console.error("Error creating order:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi đặt hàng",
      error: error.message,
    });
  }
};

/**
 * Lấy danh sách đơn hàng theo user đã đăng nhập
 */
const getUserOrders = async (req, res) => {
  try {
    // Kiểm tra user ID từ token
    const userId = req.user.userId;

    // Phân trang
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Lọc theo trạng thái nếu có
    const whereCondition = { userId };
    if (req.query.status) {
      whereCondition.status = req.query.status;
    }

    // Lấy danh sách đơn hàng và tổng số đơn
    const { count, rows: orders } = await Order.findAndCountAll({
      where: whereCondition,
      include: [
        {
          model: OrderItem,
          as: "orderItems",
          attributes: ["orderItemId", "productId", "orderQuantity", "price", "amount"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
      distinct: true,
    });

    // Tính tổng số trang
    const totalPages = Math.ceil(count / limit);

    return res.status(200).json({
      success: true,
      data: orders,
      pagination: {
        totalItems: count,
        totalPages,
        currentPage: page,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    console.error("Error fetching user orders:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lấy danh sách đơn hàng",
      error: error.message,
    });
  }
};

/**
 * Lấy chi tiết đơn hàng
 */
const getOrderDetail = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user?.userId;

    const order = await Order.findOne({
      where: { orderId },
      include: [
        {
          model: OrderItem,
          as: "orderItems",
          attributes: ["orderItemId", "productId", "orderQuantity", "price", "amount"],
        },
      ],
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng",
      });
    }

    return res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("Error fetching order details:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lấy chi tiết đơn hàng",
      error: error.message,
    });
  }
};

/**
 * Hủy đơn hàng (chỉ cho phép hủy đơn hàng "Chờ xử lý")
 */
const cancelOrder = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { orderId } = req.params;
    const userId = req.user?.userId;

    // Tìm đơn hàng
    const order = await Order.findOne({
      where: { orderId },
      include: [
        {
          model: OrderItem,
          as: "orderItems",
          attributes: ["orderItemId", "productId", "orderQuantity", "price", "amount"],
        },
      ],
      transaction,
    });

    if (!order) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng",
      });
    }

    // Kiểm tra quyền (chỉ cho admin hoặc chủ đơn hàng)
    if (!req.user.isAdmin && order.userId !== userId) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền hủy đơn hàng này",
      });
    }

    // Kiểm tra trạng thái đơn hàng
    if (order.status !== "Chờ xử lý") {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Không thể hủy đơn hàng ở trạng thái ${order.status}`,
      });
    }

    // Cập nhật trạng thái đơn hàng
    await order.update({ status: "Đã hủy" }, { transaction });

    // Khôi phục số lượng sản phẩm trong kho
    for (const item of order.orderItems) {
      await Product.increment("quantity", {
        by: item.orderQuantity,
        where: { productId: item.productId },
        transaction,
      });
    }

    // Commit transaction
    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: "Đã hủy đơn hàng thành công",
    });
  } catch (error) {
    // Rollback transaction nếu có lỗi
    if (transaction) await transaction.rollback();

    console.error("Error canceling order:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi hủy đơn hàng",
      error: error.message,
    });
  }
};

/**
 * ADMIN: Lấy tất cả đơn hàng (Phân trang, lọc, sắp xếp)
 */
const getAllOrders = async (req, res) => {
  try {
    // Phân trang
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Sắp xếp
    const sortField = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder || "DESC";

    // Lọc theo trạng thái, phương thức thanh toán, ngày
    const whereCondition = {};

    if (req.query.status) {
      whereCondition.status = req.query.status;
    }

    if (req.query.paymentMethod) {
      whereCondition.paymentMethod = req.query.paymentMethod;
    }

    if (req.query.fromDate) {
      if (!whereCondition.createdAt) whereCondition.createdAt = {};
      whereCondition.createdAt[Op.gte] = new Date(req.query.fromDate);
    }

    if (req.query.toDate) {
      if (!whereCondition.createdAt) whereCondition.createdAt = {};
      const toDate = new Date(req.query.toDate);
      toDate.setDate(toDate.getDate() + 1); // Đến hết ngày
      whereCondition.createdAt[Op.lt] = toDate;
    }

    // Tìm kiếm theo tên khách hàng hoặc số điện thoại
    if (req.query.search) {
      const searchQuery = req.query.search;
      whereCondition[Op.or] = [
        { customerName: { [Op.like]: `%${searchQuery}%` } },
        { phoneNumber: { [Op.like]: `%${searchQuery}%` } },
      ];
    }

    // Lấy danh sách đơn hàng và tổng số đơn
    const { count, rows: orders } = await Order.findAndCountAll({
      where: whereCondition,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["userId", "fullName", "email"],
        },
        {
          model: OrderItem,
          as: "orderItems",
        },
      ],
      order: [[sortField, sortOrder]],
      limit,
      offset,
      distinct: true,
    });

    // Tính tổng số trang
    const totalPages = Math.ceil(count / limit);

    return res.status(200).json({
      success: true,
      data: orders,
      pagination: {
        totalItems: count,
        totalPages,
        currentPage: page,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    console.error("Error fetching all orders:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lấy danh sách đơn hàng",
      error: error.message,
    });
  }
};

/**
 * ADMIN: Cập nhật trạng thái đơn hàng
 */
const updateOrderStatus = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { orderId } = req.params;
    const { status } = req.body;

    // Kiểm tra status hợp lệ
    const validStatuses = ["Chờ xử lý", "Đang giao hàng", "Đã giao hàng", "Đã hủy"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái đơn hàng không hợp lệ",
      });
    }

    // Tìm đơn hàng
    const order = await Order.findOne({
      where: { orderId },
      include: [
        {
          model: OrderItem,
          as: "orderItems",
        },
      ],
      transaction,
    });

    if (!order) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng",
      });
    }

    // Kiểm tra logic cập nhật trạng thái
    const currentStatus = order.status;

    // Không cho phép cập nhật từ trạng thái "Đã hủy" hoặc "Đã giao hàng" sang trạng thái khác
    if (currentStatus === "Đã hủy" || currentStatus === "Đã giao hàng") {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Không thể thay đổi trạng thái của đơn hàng đã ${currentStatus.toLowerCase()}`,
      });
    }

    // Xử lý logic đặc biệt khi hủy đơn
    if (status === "Đã hủy" && currentStatus !== "Đã hủy") {
      // Khôi phục số lượng sản phẩm trong kho
      for (const item of order.orderItems) {
        await Product.increment("quantity", {
          by: item.orderQuantity,
          where: { productId: item.productId },
          transaction,
        });
      }
    }

    // Cập nhật trạng thái
    await order.update({ status }, { transaction });

    // Commit transaction
    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: `Đã cập nhật trạng thái đơn hàng thành '${status}'`,
    });
  } catch (error) {
    // Rollback transaction nếu có lỗi
    if (transaction) await transaction.rollback();

    console.error("Error updating order status:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi cập nhật trạng thái đơn hàng",
      error: error.message,
    });
  }
};

/**
 * Lấy đơn hàng theo số điện thoại (cho khách hàng chưa đăng nhập)
 */
const getOrdersByPhoneNumber = async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    // Tìm các đơn hàng theo số điện thoại
    const orders = await Order.findAll({
      where: { phoneNumber },
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: OrderItem,
          as: "orderItems",
        },
      ],
    });

    return res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error("Error fetching orders by phone number:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi tìm kiếm đơn hàng",
      error: error.message,
    });
  }
};

/**
 * Xóa đơn hàng
 */
const deleteOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    // Tìm đơn hàng
    const order = await Order.findByPk(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng",
      });
    }

    // Chỉ xóa đơn hàng đã hủy hoặc đã giao hàng
    if (order.status !== "Đã hủy" && order.status !== "Đã giao hàng") {
      return res.status(400).json({
        success: false,
        message: "Chỉ có thể xóa đơn hàng đã hủy hoặc đã giao hàng",
      });
    }

    // Xóa đơn hàng và các OrderItem liên quan (dựa vào CASCADE)
    await order.destroy();

    return res.status(200).json({
      success: true,
      message: "Đã xóa đơn hàng thành công",
    });
  } catch (error) {
    console.error("Error deleting order:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi xóa đơn hàng",
      error: error.message,
    });
  }
};

const getRevenueStatistics = async (req, res) => {
  try {
    // Lấy tham số timeframe từ request
    const { timeframe = "7days" } = req.query;

    // Tính ngày bắt đầu dựa vào timeframe
    const startDate = new Date();
    let days = 7; // mặc định 7 ngày

    switch (timeframe) {
      case "30days":
        days = 30;
        break;
      case "3months":
        days = 90;
        break;
      case "6months":
        days = 180;
        break;
      case "1year":
        days = 365;
        break;
      default:
        days = 7;
    }

    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Sửa lỗi "ambiguous column" bằng cách chỉ định rõ bảng cho createdAt
    const revenueByDay = await Order.findAll({
      attributes: [
        // Chỉ định rõ cột createdAt từ bảng Orders
        [sequelize.fn("DATE", sequelize.col("Order.createdAt")), "date"],
        [
          sequelize.fn("SUM", sequelize.literal("OrderItems.price * OrderItems.orderQuantity")),
          "revenue",
        ],
      ],
      include: [
        {
          model: OrderItem,
          as: "orderItems",
          attributes: [],
          required: true, // Đảm bảo INNER JOIN
        },
      ],
      where: {
        createdAt: { [Op.gte]: startDate },
        // Lọc các đơn hàng đã hủy
        status: { [Op.notIn]: ["Đã hủy", "Cancelled"] },
      },
      group: [sequelize.fn("DATE", sequelize.col("Order.createdAt"))],
      order: [[sequelize.fn("DATE", sequelize.col("Order.createdAt")), "ASC"]],
      raw: true,
    });

    // Điền đầy đủ dữ liệu cho mỗi ngày trong khoảng thời gian
    const result = [];
    const endDate = new Date();
    const currentDate = new Date(startDate);

    // Tạo mảng chứa tất cả ngày trong khoảng
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split("T")[0];

      // Tìm doanh thu cho ngày hiện tại
      const dayData = revenueByDay.find((item) => item.date === dateStr);

      result.push({
        date: dateStr,
        revenue: dayData ? parseFloat(dayData.revenue || 0) : 0,
      });

      // Tăng lên ngày tiếp theo
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return res.status(200).json({
      success: true,
      message: "Lấy dữ liệu doanh thu thành công",
      data: result,
    });
  } catch (error) {
    console.error("Error getting revenue statistics:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lấy thống kê doanh thu",
      error: error.message,
    });
  }
};
/**
 * Lấy danh sách đơn hàng theo cửa hàng
 */
const getOrdersByStore = async (req, res) => {
  try {
    const { storeId } = req.params;

    // Validate storeId
    if (!storeId) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp mã cửa hàng",
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

    // Kiểm tra quyền truy cập (admin hoặc manager của cửa hàng)
    const isAuthorized =
      req.user.isAdmin || (req.user.role === "manager" && req.user.storeId === storeId);

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền truy cập dữ liệu của cửa hàng này",
      });
    }

    // Phân trang
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Lọc theo trạng thái và thời gian
    const whereCondition = { storeId };

    if (req.query.status) {
      whereCondition.status = req.query.status;
    }

    // Lọc theo ngày tạo
    if (req.query.fromDate) {
      if (!whereCondition.createdAt) whereCondition.createdAt = {};
      whereCondition.createdAt[Op.gte] = new Date(req.query.fromDate);
    }

    if (req.query.toDate) {
      if (!whereCondition.createdAt) whereCondition.createdAt = {};
      const toDate = new Date(req.query.toDate);
      toDate.setDate(toDate.getDate() + 1); // Để bao gồm cả ngày kết thúc
      whereCondition.createdAt[Op.lt] = toDate;
    }

    // Tìm kiếm
    if (req.query.search) {
      whereCondition[Op.or] = [
        { customerName: { [Op.like]: `%${req.query.search}%` } },
        { phoneNumber: { [Op.like]: `%${req.query.search}%` } },
      ];
    }

    // Sắp xếp
    const sortField = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder || "DESC";
    const orderOption = [[sortField, sortOrder]];

    // Truy vấn dữ liệu
    const { count, rows: orders } = await Order.findAndCountAll({
      where: whereCondition,
      include: [
        {
          model: OrderItem,
          as: "orderItems",
          include: [
            {
              model: Product,
              as: "product",
              attributes: ["productId", "productName", "price", "thumbnail"],
            },
          ],
        },
        {
          model: User,
          as: "user",
          attributes: ["userId", "email", "fullName", "phoneNumber"],
        },
      ],
      order: orderOption,
      limit,
      offset,
      distinct: true,
    });

    // Tính tổng số trang
    const totalPages = Math.ceil(count / limit);

    // Tính tổng doanh thu của các đơn hàng được truy vấn
    let totalRevenue = 0;
    if (orders && orders.length > 0) {
      for (const order of orders) {
        // Bỏ qua các đơn hàng đã hủy
        if (order.status !== "Đã hủy" && order.status !== "Cancelled") {
          if (order.totalAmount) {
            totalRevenue += order.totalAmount;
          } else if (order.orderItems && order.orderItems.length > 0) {
            // Tính tổng từ các orderItems nếu không có totalAmount
            totalRevenue += order.orderItems.reduce(
              (sum, item) => sum + item.price * item.orderQuantity,
              0
            );
          }
        }
      }
    }

    return res.status(200).json({
      success: true,
      data: orders,
      pagination: {
        totalItems: count,
        totalPages,
        currentPage: page,
        itemsPerPage: limit,
      },
      summary: {
        totalOrders: count,
        totalRevenue,
      },
    });
  } catch (error) {
    console.error("Error fetching orders by store:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lấy danh sách đơn hàng theo cửa hàng",
      error: error.message,
    });
  }
};

// Đảm bảo thêm vào exports của module
module.exports = {
  // Các phương thức hiện có...
  createOrder,
  getUserOrders,
  getOrderDetail,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
  getOrdersByPhoneNumber,
  deleteOrder,
  getOrdersByStore,
  getRevenueStatistics, // Thêm phương thức mới
};
