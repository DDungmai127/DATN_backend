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
    const userId = req.body?.userId || null;

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
 * Lấy đơn hàng hiện tại của người dùng đã đăng nhập (dựa trên userId hoặc số điện thoại)
 */
const getCurrentOrders = async (req, res) => {
  try {
    // Lấy thông tin người dùng từ token
    const user = req.user;
    console.log("User info from token:", user);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Bạn cần đăng nhập để xem đơn hàng",
      });
    }

    // Phân trang
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Tạo điều kiện lọc: dựa vào userId hoặc số điện thoại
    let whereCondition = {
      status: {
        [Op.in]: ["Chờ xử lý", "Đang giao hàng", "Đang xử lý"],
      },
    };

    // Nếu có userId, ưu tiên tìm theo userId
    if (user.userId) {
      whereCondition.userId = user.userId;
    }

    // Nếu có phoneNumber, tìm thêm theo số điện thoại (hoặc chỉ tìm theo số điện thoại nếu không có userId)
    if (user.phoneNumber) {
      // Nếu đã có điều kiện userId, thêm điều kiện OR
      if (whereCondition.userId) {
        whereCondition = {
          [Op.or]: [{ userId: user.userId }, { phoneNumber: user.phoneNumber }],
          status: {
            [Op.in]: ["Chờ xử lý", "Đang giao hàng", "Đang xử lý"],
          },
        };
      } else {
        // Nếu không có userId, chỉ tìm theo phoneNumber
        whereCondition.phoneNumber = user.phoneNumber;
      }
    }

    // Kiểm tra xem có đơn hàng nào khớp với điều kiện không trước
    const orderCount = await Order.count({
      where: whereCondition,
    });

    console.log(`Tìm thấy ${orderCount} đơn hàng đang xử lý`);

    if (orderCount === 0) {
      return res.status(200).json({
        success: true,
        message: "Không tìm thấy đơn hàng nào đang xử lý",
        data: [],
        pagination: {
          totalItems: 0,
          totalPages: 0,
          currentPage: page,
          itemsPerPage: limit,
        },
      });
    }

    // Nếu có đơn hàng, tiếp tục truy vấn đầy đủ
    const { count, rows: orders } = await Order.findAndCountAll({
      where: whereCondition,
      include: [
        {
          model: OrderItem,
          as: "orderItems",
          attributes: [
            "orderItemId",
            "productId",
            "productName",
            "orderQuantity",
            "price",
            "amount",
          ],
          include: [
            {
              model: Product,
              as: "product",
              attributes: ["productName", "imageUrl"],
              required: false,
            },
          ],
        },
        {
          model: Store,
          as: "store",
          attributes: ["storeName", "storeAddress", "storePhoneNumber"],
          required: false,
        },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
      distinct: true,
    });

    // Định dạng dữ liệu trả về
    const formattedOrders = orders.map((order) => {
      const orderJson = order.toJSON();

      // Đảm bảo orderItems tồn tại
      const orderItems = orderJson.orderItems || [];

      // Tính tổng tiền an toàn
      const totalAmount = orderItems.reduce((sum, item) => sum + (item.amount || 0), 0);

      // Xử lý orderId an toàn để tạo orderCode
      const orderIdStr = String(order.orderId || "");
      const orderCode = orderIdStr
        ? `ORD-${orderIdStr.substring(0, 8).toUpperCase()}`
        : "ORD-UNKNOWN";

      return {
        ...orderJson,
        totalAmount,
        orderCode,
        orderDate: order.createdAt,
      };
    });

    return res.status(200).json({
      success: true,
      data: formattedOrders,
      pagination: {
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    console.error("Error details:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lấy đơn hàng hiện tại",
      error: error.message,
    });
  }
};

/**
 * Lấy lịch sử đơn hàng của người dùng đăng nhập (đã giao, đã hủy)
 */
const getOrderHistory = async (req, res) => {
  try {
    // Lấy userId từ token đăng nhập
    const userId = req.user.userId;

    // Phân trang
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Lọc theo thời gian nếu có
    const whereCondition = {
      userId,
      status: {
        [Op.in]: ["Đã giao hàng", "Đã hủy"],
      },
    };
    // Lọc theo trạng thái cụ thể nếu có
    if (req.query.status && ["Đã giao hàng", "Đã hủy"].includes(req.query.status)) {
      whereCondition.status = req.query.status;
    }

    // Truy vấn dữ liệu
    const { count, rows: orders } = await Order.findAndCountAll({
      where: whereCondition,
      include: [
        {
          model: OrderItem,
          as: "orderItems",
          attributes: [
            "orderItemId",
            "productId",
            "productName",
            "orderQuantity",
            "price",
            "amount",
          ],
          include: [
            {
              model: Product,
              as: "product",
              attributes: ["productName", "imageUrl"],
            },
          ],
        },
        {
          model: Store,
          as: "store",
          attributes: ["storeName", "storeAddress", "storePhoneNumber"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
      distinct: true,
    });

    // Tính tổng số trang
    const totalPages = Math.ceil(count / limit);
    // Định dạng dữ liệu trả về
    const formattedOrders = orders.map((order) => {
      const orderJson = order.toJSON();
      // Tính tổng tiền từ các orderItems
      const totalAmount = orderJson.orderItems.reduce((sum, item) => sum + item.amount, 0);

      return {
        ...orderJson,
        totalAmount,
        // Thêm mã đơn hàng hiển thị ngắn gọn
        orderCode: order.orderId,
        // Format ngày đặt hàng để dễ đọc
        orderDate: order.createdAt,
      };
    });

    // Tính tổng đơn hàng thành công và đã hủy
    const completedOrders = formattedOrders.filter(
      (order) => order.status === "Đã giao hàng"
    ).length;
    const cancelledOrders = formattedOrders.filter((order) => order.status === "Đã hủy").length;

    return res.status(200).json({
      success: true,
      data: formattedOrders,
      pagination: {
        totalItems: count,
        totalPages,
        currentPage: page,
        itemsPerPage: limit,
      },
      summary: {
        completedOrders,
        cancelledOrders,
      },
    });
  } catch (error) {
    console.error("Error fetching order history:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lấy lịch sử đơn hàng",
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
          include: [
            {
              model: Product,
              as: "product",
              attributes: ["productName"],
            },
          ],
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
 * Lấy thống kê doanh thu theo từng cửa hàng
 */
const getRevenueByStore = async (req, res) => {
  try {
    // Lấy tham số timeframe từ request
    const { timeframe = "7days", storeId } = req.query;

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

    // Xây dựng điều kiện WHERE
    const whereCondition = {
      createdAt: { [Op.gte]: startDate },
      // Chỉ tính doanh thu từ đơn hàng đã hoàn thành
      status: "Đã giao hàng",
    };

    // Nếu có storeId cụ thể, thêm vào điều kiện
    if (storeId && storeId !== "all") {
      whereCondition.storeId = storeId;
    }

    // Lấy tất cả cửa hàng để trả về thông tin
    const stores = await Store.findAll({
      attributes: ["storeId", "storeName"],
    });

    // Nếu chỉ muốn doanh thu của một cửa hàng cụ thể
    if (storeId && storeId !== "all") {
      // Truy vấn doanh thu theo ngày của cửa hàng cụ thể
      const revenueByDay = await Order.findAll({
        attributes: [
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
            required: true,
          },
        ],
        where: whereCondition,
        group: [sequelize.fn("DATE", sequelize.col("Order.createdAt"))],
        order: [[sequelize.fn("DATE", sequelize.col("Order.createdAt")), "ASC"]],
        raw: true,
      });

      // Điền đầy đủ dữ liệu cho mỗi ngày trong khoảng thời gian
      const result = [];
      const endDate = new Date();
      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split("T")[0];
        const dayData = revenueByDay.find((item) => item.date === dateStr);

        result.push({
          date: dateStr,
          revenue: dayData ? parseFloat(dayData.revenue || 0) : 0,
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }

      return res.status(200).json({
        success: true,
        message: `Lấy dữ liệu doanh thu của cửa hàng thành công`,
        data: result,
        storeInfo: stores.find((store) => store.storeId == storeId),
      });
    } else {
      // Nếu muốn doanh thu theo cửa hàng cho tất cả các cửa hàng
      // Truy vấn doanh thu theo ngày và cửa hàng
      const revenueByStoreAndDay = await Order.findAll({
        attributes: [
          [sequelize.fn("DATE", sequelize.col("Order.createdAt")), "date"],
          ["storeId", "storeId"],
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
            required: true,
          },
        ],
        where: whereCondition,
        group: [sequelize.fn("DATE", sequelize.col("Order.createdAt")), "Order.storeId"],
        order: [
          [sequelize.fn("DATE", sequelize.col("Order.createdAt")), "ASC"],
          ["storeId", "ASC"],
        ],
        raw: true,
      });

      // Điền đầy đủ dữ liệu cho mỗi ngày và mỗi cửa hàng
      const dateMap = {};
      const endDate = new Date();
      const currentDate = new Date(startDate);

      // Tạo cấu trúc dữ liệu cho mỗi ngày
      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split("T")[0];

        // Khởi tạo object với ngày và doanh thu tổng
        dateMap[dateStr] = {
          date: dateStr,
          total: 0,
        };

        // Thêm doanh thu 0 cho mỗi cửa hàng
        stores.forEach((store) => {
          dateMap[dateStr][store.storeId] = 0;
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Điền dữ liệu doanh thu thực tế vào cấu trúc
      revenueByStoreAndDay.forEach((item) => {
        const dateStr = item.date;
        const storeId = item.storeId;
        const revenue = parseFloat(item.revenue || 0);

        if (dateMap[dateStr]) {
          // Cập nhật doanh thu cho cửa hàng cụ thể
          if (storeId && dateMap[dateStr][storeId] !== undefined) {
            dateMap[dateStr][storeId] = revenue;
          }

          // Cộng vào tổng doanh thu của ngày
          dateMap[dateStr].total += revenue;
        }
      });

      // Chuyển đổi từ object sang mảng
      const result = Object.values(dateMap);

      return res.status(200).json({
        success: true,
        message: "Lấy dữ liệu doanh thu theo cửa hàng thành công",
        data: result,
        stores: stores,
      });
    }
  } catch (error) {
    console.error("Error getting revenue by store statistics:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lấy thống kê doanh thu theo cửa hàng",
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
              attributes: ["productId", "productName", "price", "imageUrl"],
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
  getOrderDetail,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
  getOrdersByPhoneNumber,
  deleteOrder,
  getOrdersByStore,
  getRevenueStatistics,
  getRevenueByStore, // Thêm hàm mới
  getCurrentOrders,
  getOrderHistory,
};
