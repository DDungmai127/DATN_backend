const multer = require("multer");
const path = require("path");
const slugify = require("slugify");

// Config multer - type : product/category
const createStorage = (type) => {
  return multer.diskStorage({
    // Folder to save images
    destination: (req, file, cb) => {
      if (type === "category") {
        cb(null, path.join(__dirname, "../uploads/categories"));
      } else if (type == "product") {
        cb(null, path.join(__dirname, "../uploads/products"));
      } else {
        cb(null, path.join(__dirname, "../uploads"));
      }
    },

    filename: (req, file, cb) => {
      let name;
      if (type === "category") {
        name = req.body.categoryName;
      } else if (type === "product") {
        name = req.body.productName;
      } else {
        name = "file";
      }
      if (!name) {
        return cb(new Error("Missing name in request body"), null);
      }

      // Tạo slug từ categoryName
      const slug = slugify(name, { lower: true, strict: true });
      const fileExtension = path.extname(file.originalname); // Lấy phần mở rộng của file
      const fileName = `${slug}${fileExtension}`; // Tên file: slug + phần mở rộng

      cb(null, fileName); // Đặt tên file
    },
  });
};

// Chỉ chấp nhận file ảnh
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Chỉ chấp nhận file ảnh!"), false);
  }
};
const categoryUpload = multer({
  storage: createStorage("category"),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // Giới hạn kích thước file 5MB
});

const productUpload = multer({
  storage: createStorage("product"),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // Giới hạn kích thước file 5MB
});
// Middleware xử lý lỗi upload
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File quá lớn. Kích thước tối đa là 5MB.",
      });
    }
    return res.status(400).json({
      success: false,
      message: `Lỗi upload: ${err.message}`,
    });
  }

  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  next();
};

module.exports = {
  uploadCategory: categoryUpload.single("categoryImage"),
  uploadProduct: productUpload.single("productImage"),
  handleUploadError,
};
