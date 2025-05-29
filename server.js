const express = require("express");
const dotenv = require("dotenv");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const bodyParser = require("body-parser");
const sequelize = require("./models").sequelize;
const productRoutes = require("./routes/productRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/AuthRoutes");
const userRoutes = require("./routes/userRoutes");
const discountRoutes = require("./routes/discountRoutes");
const orderRoutes = require("./routes/orderRoutes");
const storeRoutes = require("./routes/storeRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
// Khởi tạo ứng dụng
const app = express();
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(bodyParser.json()); // Parse body JSON
app.use(bodyParser.urlencoded({ extended: true })); // Parse URL-encoded datam xu ly form data
app.use(cookieParser());
// Cấu hình môi trường từ .env
// app.use("/uploads", express.static(path.join(__dirname, "uploads")));
dotenv.config();
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
// Middleware
app.use(express.json()); // Parse body JSON
app.use(helmet()); // Bảo mật HTTP headers
//app.use(morgan("dev"));  Ghi log các request vào console

// Kiểm tra kết nối database và đồng bộ các models
sequelize
  .authenticate()
  .then(() => console.log("Database connected!"))
  .catch((err) => console.error("Database connection error:", err));
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/users", userRoutes);
app.use("/api/discounts", discountRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/stores", storeRoutes);
app.use("/api/inventory", inventoryRoutes);
// Thêm middleware để log request
// app.use((req, res, next) => {
//     console.log(`${req.method} ${req.url}`);
//     console.log("Headers:", req.headers);
//     if (req.body) console.log("Body:", req.body);
//     if (req.file) console.log("File:", req.file);
//     if (req.files) console.log("Files:", req.files);
//     next();
// });
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Welcome to the API server!",
  });
});

// Xử lý lỗi chungd
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// Khởi động server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
