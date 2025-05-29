const {
  Product,
  Category,
  Discount,
  DetailCategory,
  DetailCategory_Product,
  sequelize,
} = require("../models");
const { Op, Sequelize } = require("sequelize");
const slugify = require("slugify");
const fs = require("fs");
const path = require("path");

/**
 * Lấy danh sách sản phẩm có phân trang và lọc
 */
const getProducts = async (req, res) => {
  try {
    // Các tham số từ query
    const {
      page = 1,
      limit = 10,
      search = "",
      categoryId,
      sortBy = "createdAt",
      sortOrder = "DESC",
      minPrice,
      maxPrice,
      status,
      include = "",
    } = req.query;

    // Xây dựng điều kiện truy vấn
    const whereConditions = {};

    // Tìm kiếm theo tên hoặc mô tả
    if (search) {
      whereConditions[Op.or] = [
        { productName: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { slug: { [Op.like]: `%${search}%` } },
      ];
    }

    // Lọc theo danh mục
    if (categoryId) {
      whereConditions.categoryId = categoryId;
    }

    // Lọc theo giá
    if (minPrice) {
      whereConditions.price = {
        ...whereConditions.price,
        [Op.gte]: minPrice,
      };
    }

    if (maxPrice) {
      whereConditions.price = {
        ...whereConditions.price,
        [Op.lte]: maxPrice,
      };
    }

    // Lọc theo trạng thái
    if (status) {
      whereConditions.status = status;
    }

    // Tính toán phân trang
    const offset = (parseInt(page) - 1) * parseInt(limit);
    // Tạo mảng include cho truy vấn
    const includeModels = [
      {
        model: Category,
        as: "category",
        attributes: ["categoryId", "categoryName"],
      },
      {
        model: Discount,
        as: "discount",
        attributes: ["DiscountId", "DiscountName", "DiscountValue"],
      },
    ];

    // Thêm DetailCategories nếu có yêu cầu trong query
    if (include.includes("detailCategories")) {
      includeModels.push({
        model: DetailCategory,
        as: "detailCategories",
        through: { attributes: [] }, // Không lấy dữ liệu từ bảng trung gian
      });
    }

    // Thực hiện truy vấn
    const { rows: products, count: totalItems } = await Product.findAndCountAll({
      where: whereConditions,
      limit: parseInt(limit),
      offset: offset,
      order: [[sortBy, sortOrder]],
      include: includeModels,
    });

    // Tính toán số trang
    const totalPages = Math.ceil(totalItems / parseInt(limit));

    // Trả về kết quả
    return res.status(200).json({
      success: true,
      data: products,
      pagination: {
        totalItems,
        totalPages,
        currentPage: parseInt(page),
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Error getting products:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lấy danh sách sản phẩm",
      error: error.message,
    });
  }
};

/**
 * Lấy chi tiết một sản phẩm theo ID hoặc slug
 */
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    // Tìm sản phẩm theo ID hoặc slug
    const whereCondition = {};

    if (id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
      // Nếu id có định dạng UUID
      whereCondition.productId = id;
    } else {
      // Nếu không, xem như là slug
      whereCondition.slug = id;
    }

    const product = await Product.findOne({
      where: whereCondition,
      include: [
        {
          model: Category,
          as: "category",
          attributes: ["categoryId", "categoryName"],
        },
        {
          model: Discount,
          as: "discount",
          attributes: ["DiscountId", "DiscountName", "DiscountValue"],
        },
      ],
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm",
      });
    }

    // Tính giá sau khi giảm giá nếu có
    let finalPrice = product.price;
    if (product.discount && product.discount.DiscountValue) {
      finalPrice = product.price * (1 - product.discount.DiscountValue / 100);
    }

    return res.status(200).json({
      success: true,
      data: {
        ...product.toJSON(),
        finalPrice: Math.round(finalPrice),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lấy thông tin sản phẩm",
      error: error.message,
    });
  }
};
// lấy chi tiết danh mục của sản phẩm
const getProductDetailCategories = async (req, res) => {
  try {
    const { productId } = req.params;

    // Lấy các detailCategoryId từ bảng trung gian trước
    const detailCategoryProducts = await DetailCategory_Product.findAll({
      where: { ProductID: productId },
      attributes: ["DetailCategoryID"],
    });
    // Lấy danh sách ID
    const detailCategoryIds = detailCategoryProducts.map((dcp) => dcp.DetailCategoryID);

    // Không có chi tiết danh mục nào
    if (detailCategoryIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    // Lấy chi tiết danh mục từ danh sách ID
    const detailCategories = await DetailCategory.findAll({
      where: {
        DetailCategoryId: {
          [Op.in]: detailCategoryIds,
        },
      },
    });

    return res.status(200).json({
      success: true,
      data: detailCategories,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lấy chi tiết danh mục của sản phẩm",
      error: error.message,
    });
  }
};
const addDetailCategoryProduct = async (req, res) => {
  try {
    const { productId, DetailCategoryIds } = req.body;

    // Validate dữ liệu đầu vào
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Thiếu productId",
      });
    }

    if (!DetailCategoryIds || !Array.isArray(DetailCategoryIds)) {
      return res.status(400).json({
        success: false,
        message: "DetailCategoryIds phải là một mảng",
      });
    }

    // Kiểm tra xem các DetailCategoryId có tồn tại không
    const existingDetailCategories = await DetailCategory.findAll({
      where: {
        DetailCategoryId: {
          [Op.in]: DetailCategoryIds,
        },
      },
      attributes: ["DetailCategoryId"],
    });

    // Lấy danh sách ID tồn tại
    const existingIds = existingDetailCategories.map((dc) => dc.DetailCategoryId);

    // Tạo mảng dữ liệu chỉ với các ID tồn tại
    const detailCategoryProducts = existingIds.map((DetailCategoryId) => ({
      ProductID: productId,
      DetailCategoryID: DetailCategoryId,
    }));

    // Thêm các liên kết mới vào database
    await DetailCategory_Product.bulkCreate(detailCategoryProducts);

    return res.status(200).json({
      success: true,
      message: "Cập nhật chi tiết danh mục cho sản phẩm thành công",
      count: detailCategoryProducts.length,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi cập nhật chi tiết danh mục",
      error: error.message,
    });
  }
};

// Xoá chi tiết danh mục

const deleteProductDetailCategories = async (req, res) => {
  try {
    const { productId } = req.params;
    console.log(`Đang xóa chi tiết danh mục cho sản phẩm ${productId}`);

    // Đếm số lượng chi tiết danh mục trước khi xóa
    const count = await DetailCategory_Product.count({
      where: { ProductID: productId },
    });

    console.log(`Tìm thấy ${count} chi tiết danh mục`);

    if (count === 0) {
      return res.status(200).json({
        success: true,
        message: "Không có chi tiết danh mục để xóa",
        deletedCount: 0,
      });
    }

    // Xóa bằng model thay vì raw SQL query để tránh vấn đề với tên bảng/cột
    const deleteCount = await DetailCategory_Product.destroy({
      where: { ProductID: productId },
    });

    console.log(`Đã xóa ${deleteCount} chi tiết danh mục bằng phương thức: Model with ProductID`);

    return res.status(200).json({
      success: true,
      message: `Đã xóa ${deleteCount} chi tiết danh mục bằng phương thức: Model with ProductID`,
      deletedCount: deleteCount,
    });
  } catch (error) {
    console.error("Lỗi khi xóa chi tiết danh mục:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi xóa chi tiết danh mục: " + error.message,
      error: error.message,
    });
  }
};

const createProduct = async (req, res) => {
  try {
    const {
      productName,
      description,
      providerName,
      price,
      quantity,
      unitOfMeasurement,
      expirationDate,
      status = "active",
      categoryId,
      discountId,
      imageUrl: imageUrlFromBody,
    } = req.body;

    // Kiểm tra các trường bắt buộc
    if (!productName || !description || !price || !unitOfMeasurement || !expirationDate) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp đầy đủ thông tin sản phẩm",
        requiredFields: [
          "productName",
          "description",
          "price",
          "unitOfMeasurement",
          "expirationDate",
        ],
      });
    }

    // Xử lý hình ảnh từ middleware upload
    let imageUrl = null;
    if (req.file) {
      imageUrl = `/uploads/products/${req.file.filename}`;
    } else if (imageUrlFromBody) {
      imageUrl = imageUrlFromBody;
    } else {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp hình ảnh sản phẩm",
      });
    }

    // Tạo slug từ tên sản phẩm
    let slug = slugify(productName, { lower: true, strict: true });

    // Kiểm tra xem slug đã tồn tại chưa
    const existingProduct = await Product.findOne({ where: { slug } });
    if (existingProduct) {
      // Nếu slug đã tồn tại, thêm timestamp để tạo slug duy nhất
      slug = `${slug}`;
    }

    // Tạo sản phẩm mới
    const newProduct = await Product.create({
      productName,
      description,
      imageUrl,
      providerName,
      price,
      quantity,
      unitOfMeasurement,
      expirationDate,
      status,
      categoryId,
      discountId,
      slug,
    });

    return res.status(201).json({
      success: true,
      message: "Tạo sản phẩm thành công",
      data: newProduct,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi tạo sản phẩm",
      error: error.message,
    });
  }
};

/**
 * Cập nhật thông tin sản phẩm
 */

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      productName,
      description,
      providerName,
      price,
      quantity,
      unitOfMeasurement,
      expirationDate,
      status,
      categoryId,
      discountId,
    } = req.body;

    // Tìm sản phẩm hiện tại
    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm",
      });
    }

    // Kiểm tra nếu categoryId được thay đổi - chỉ để ghi log, không cần xóa chi tiết ở đây
    const isCategoryChanged = categoryId && categoryId !== product.categoryId;
    if (isCategoryChanged) {
      console.log(
        `Đã phát hiện thay đổi danh mục cho sản phẩm ${id} từ ${product.categoryId} sang ${categoryId}`
      );
      // Không xóa chi tiết danh mục ở đây nữa, việc này sẽ được frontend xử lý thông qua API riêng
    }

    // Xử lý hình ảnh mới (nếu có)
    let imageUrl = product.imageUrl;
    if (req.file) {
      // Lưu đường dẫn hình ảnh mới
      imageUrl = `/uploads/products/${req.file.filename}`;

      // Xóa hình ảnh cũ nếu có
      if (product.imageUrl) {
        try {
          const oldImagePath = product.imageUrl.startsWith("/")
            ? product.imageUrl.substring(1)
            : product.imageUrl;

          const filePath = path.join(__dirname, "..", "public", oldImagePath);

          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (err) {
          console.error("Lỗi khi xóa file ảnh cũ:", err);
          // Vẫn tiếp tục xử lý ngay cả khi không xóa được ảnh cũ
        }
      }
    }

    // Cập nhật slug nếu tên sản phẩm thay đổi
    let slug = product.slug;
    if (productName && productName !== product.productName) {
      slug = slugify(productName, { lower: true, strict: true });

      // Kiểm tra xem slug mới có bị trùng không
      const existingProduct = await Product.findOne({
        where: {
          slug,
          productId: { [Op.ne]: id },
        },
      });

      if (existingProduct) {
        // Nếu slug đã tồn tại, thêm timestamp để tạo slug duy nhất
        slug = `${slug}-${Date.now()}`;
      }
    }

    // Cập nhật thông tin sản phẩm
    await product.update({
      productName: productName || product.productName,
      description: description || product.description,
      imageUrl,
      providerName: providerName || product.providerName,
      price: price !== undefined ? price : product.price,
      quantity: quantity !== undefined ? quantity : product.quantity,
      unitOfMeasurement: unitOfMeasurement || product.unitOfMeasurement,
      expirationDate: expirationDate || product.expirationDate,
      status: status || product.status,
      categoryId: categoryId || product.categoryId,
      discountId: discountId || product.discountId,
      slug,
    });

    return res.status(200).json({
      success: true,
      message: isCategoryChanged
        ? "Cập nhật sản phẩm thành công. Lưu ý: Đã thay đổi danh mục, cần cập nhật chi tiết danh mục nếu cần."
        : "Cập nhật sản phẩm thành công",
      data: product,
    });
  } catch (error) {
    console.error("Error updating product:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi cập nhật sản phẩm",
      error: error.message,
    });
  }
};
/**
 * Xóa sản phẩm
 */
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // Tìm sản phẩm
    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm",
      });
    }

    // Lưu lại đường dẫn ảnh để xóa sau
    const imageUrl = product.imageUrl;

    // Xóa sản phẩm
    await product.destroy();

    // Xóa file ảnh
    if (imageUrl) {
      try {
        const imagePath = imageUrl.startsWith("/") ? imageUrl.substring(1) : imageUrl;

        const filePath = path.join(__dirname, "..", "public", imagePath);

        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`Đã xóa file ảnh: ${filePath}`);
        }
      } catch (err) {
        console.error("Lỗi khi xóa file ảnh:", err);
        // Vẫn trả về thành công vì sản phẩm đã được xóa trong database
      }
    }

    return res.status(200).json({
      success: true,
      message: "Xóa sản phẩm thành công",
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi xóa sản phẩm",
      error: error.message,
    });
  }
};

/**
 * Lấy sản phẩm theo danh mục
 */
const getProductsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Kiểm tra danh mục tồn tại
    const category = await Category.findByPk(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy danh mục",
      });
    }

    // Tính toán phân trang
    const offset = (parseInt(page) - 1) * parseInt(limit);
    try {
      // Lấy sản phẩm theo danh mục
      const { rows: products, count: totalItems } = await Product.findAndCountAll({
        where: {
          categoryId,
          status: "active", // Chỉ lấy sản phẩm đang hoạt động
        },
        limit: parseInt(limit),
        offset,
        order: [["createdAt", "DESC"]],
        include: [
          {
            model: Category,
            as: "category",
            attributes: ["categoryId", "categoryName"],
          },
          {
            model: Discount,
            as: "discount",
            attributes: ["DiscountId", "DiscountName", "DiscountValue"],
          },
        ],
      });
      // Thêm đoạn code này để kiểm tra dữ liệu
      console.log("Products count:", products.length);

      const totalPages = Math.ceil(totalItems / parseInt(limit));

      return res.status(200).json({
        success: true,
        currentPage: parseInt(page),
        totalPages,
        totalItems,
        data: products,
      });
    } catch (dbError) {
      console.error("Database error:", dbError);
      return res.status(500).json({
        success: false,
        message: "Lỗi khi truy vấn database",
        error: dbError.message,
      });
    }
  } catch (error) {
    console.error("Error getting products by category:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lấy sản phẩm theo danh mục",
      error: error.message,
    });
  }
};

/**
 * Tìm kiếm sản phẩm
 */
const searchProducts = async (req, res) => {
  try {
    const { keyword, page = 1, limit = 10 } = req.query;

    if (!keyword) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp từ khóa tìm kiếm",
      });
    }

    // Tính toán phân trang
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Tìm kiếm sản phẩm
    const { rows: products, count: totalItems } = await Product.findAndCountAll({
      where: {
        [Op.or]: [
          { productName: { [Op.like]: `%${keyword}%` } },
          { description: { [Op.like]: `%${keyword}%` } },
          { slug: { [Op.like]: `%${keyword}%` } },
        ],
        status: "active", // Chỉ tìm kiếm sản phẩm đang hoạt động
      },
      limit: parseInt(limit),
      offset,
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: Category,
          as: "category",
          attributes: ["categoryId", "categoryName"],
        },
        {
          model: Discount,
          as: "discount",
          attributes: ["DiscountId", "DiscountName", "DiscountValue"],
        },
      ],
    });

    // Tính toán số trang
    const totalPages = Math.ceil(totalItems / parseInt(limit));

    return res.status(200).json({
      success: true,
      data: products,
      pagination: {
        totalItems,
        totalPages,
        currentPage: parseInt(page),
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Error searching products:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi tìm kiếm sản phẩm",
      error: error.message,
    });
  }
};

/**
 * Lấy sản phẩm theo các DetailCategory đã chọn
 * Hỗ trợ filtering với nhiều DetailCategory khác loại
 */
const getProductsByDetailCategories = async (req, res) => {
  try {
    // Lấy các tham số từ query
    const {
      page = 1,
      limit = 10,
      categoryId,
      detailCategoryIds,
      minPrice,
      maxPrice,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    // Kiểm tra xem có detailCategoryIds không
    if (!detailCategoryIds) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp ít nhất một DetailCategoryId",
      });
    }

    // Chuyển đổi từ chuỗi thành mảng nếu có nhiều ID
    const detailCatIds = Array.isArray(detailCategoryIds)
      ? detailCategoryIds
      : detailCategoryIds.split(",");

    // Điều kiện truy vấn cơ bản - lọc sản phẩm active
    const whereConditions = {
      status: "active",
    };

    // Thêm điều kiện lọc theo danh mục chính (nếu có)
    if (categoryId) {
      whereConditions.categoryId = categoryId;
    }

    // Thêm điều kiện lọc theo giá (nếu có)
    if (minPrice || maxPrice) {
      whereConditions.price = {};

      if (minPrice) {
        whereConditions.price[Op.gte] = parseFloat(minPrice);
      }

      if (maxPrice) {
        whereConditions.price[Op.lte] = parseFloat(maxPrice);
      }
    }

    // Tính toán phân trang
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Nếu có lọc theo DetailCategory, tìm các productId thỏa mãn điều kiện
    if (detailCatIds.length > 0) {
      // Nhóm các DetailCategoryId theo DetailType
      const detailCategories = await DetailCategory.findAll({
        where: {
          DetailCategoryId: {
            [Op.in]: detailCatIds,
          },
        },
        attributes: ["DetailCategoryId", "DetailType"],
      });

      const detailTypeGroups = {};
      detailCategories.forEach((dc) => {
        if (!detailTypeGroups[dc.DetailType]) {
          detailTypeGroups[dc.DetailType] = [];
        }
        detailTypeGroups[dc.DetailType].push(dc.DetailCategoryId);
      });

      // Lấy tất cả các productId từ bảng trung gian
      const DetailCategory_Product = sequelize.models.DetailCategory_Product;
      const productDetailTypeMap = {};

      for (const detailType in detailTypeGroups) {
        const detailCategoryIdsForType = detailTypeGroups[detailType];

        const relations = await DetailCategory_Product.findAll({
          where: {
            DetailCategoryId: {
              [Op.in]: detailCategoryIdsForType,
            },
          },
          attributes: ["productId"],
        });

        const productIdsForType = [...new Set(relations.map((rel) => rel.productId))];

        // Lưu các productId vào map theo DetailType
        for (const productId of productIdsForType) {
          if (!productDetailTypeMap[productId]) {
            productDetailTypeMap[productId] = new Set();
          }
          productDetailTypeMap[productId].add(detailType);
        }
      }

      // Lọc các sản phẩm phải có ít nhất một DetailCategoryId từ mỗi DetailType
      const detailTypes = Object.keys(detailTypeGroups);
      const matchingProductIds = Object.entries(productDetailTypeMap)
        .filter(([_, types]) => detailTypes.every((type) => types.has(type)))
        .map(([productId, _]) => productId);

      // Nếu không có sản phẩm nào thỏa mãn điều kiện
      if (matchingProductIds.length === 0) {
        return res.status(200).json({
          success: true,
          message: "Không tìm thấy sản phẩm nào thỏa mãn điều kiện lọc",
          data: [],
          pagination: {
            totalItems: 0,
            totalPages: 0,
            currentPage: parseInt(page),
            itemsPerPage: parseInt(limit),
          },
        });
      }

      whereConditions.productId = {
        [Op.in]: matchingProductIds,
      };
    }

    // Thực hiện truy vấn để lấy danh sách sản phẩm
    const { rows: products, count: totalItems } = await Product.findAndCountAll({
      where: whereConditions,
      limit: parseInt(limit),
      offset: offset,
      order: [[sortBy, sortOrder]],
      include: [
        {
          model: Category,
          as: "category",
          attributes: ["categoryId", "categoryName"],
        },
        {
          model: Discount,
          as: "discount",
          attributes: ["DiscountId", "DiscountName", "DiscountValue"],
        },
      ],
      distinct: true, // Quan trọng để đếm đúng số lượng
    });

    // Tính toán số trang
    const totalPages = Math.ceil(totalItems / parseInt(limit));

    // Trả về kết quả
    return res.status(200).json({
      success: true,
      data: products,
      pagination: {
        totalItems,
        totalPages,
        currentPage: parseInt(page),
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Error filtering products by DetailCategories:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lọc sản phẩm theo chi tiết danh mục",
      error: error.message,
    });
  }
};
// Thêm function vào exports
module.exports = {
  getProducts,
  getProductById,
  getProductDetailCategories,
  addDetailCategoryProduct,
  deleteProductDetailCategories,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductsByCategory,
  searchProducts,
  getProductsByDetailCategories,
};
