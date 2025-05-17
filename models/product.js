"use strict";
const { Model } = require("sequelize");
const slugify = require("slugify");

module.exports = (sequelize, DataTypes) => {
  class Product extends Model {
    static associate(models) {
      // Liên kết với bảng Categories
      Product.belongsTo(models.Category, {
        foreignKey: "categoryId",
        as: "category",
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      });

      // Liên kết với bảng Discounts
      Product.belongsTo(models.Discount, {
        foreignKey: "discountId",
        as: "discount",
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      });
      // Quan hệ với StoreProduct
      Product.hasMany(models.StoreProduct, {
        foreignKey: "productId",
        as: "storeProducts",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });

      // Quan hệ nhiều-nhiều với Store thông qua StoreProduct
      Product.belongsToMany(models.Store, {
        through: models.StoreProduct,
        foreignKey: "productId",
        otherKey: "storeId",
        as: "stores",
      });
    }
  }

  Product.init(
    {
      productId: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      productName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      imageUrl: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      providerName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      price: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      unitOfMeasurement: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      expirationDate: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("active", "not active"),
        allowNull: true,
      },
      categoryId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      discountId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      slug: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
      },
    },
    {
      sequelize,
      modelName: "Product",
      hooks: {
        // Hook để tạo slug trước khi lưu sản phẩm
        beforeCreate: (product) => {
          if (!product.productName) {
            throw new Error("Product name is required to generate a slug.");
          }
          product.slug = slugify(product.productName, { lower: true, strict: true });
        },
        // Hook để cập nhật slug nếu productName thay đổi
        beforeUpdate: (product) => {
          if (product.changed("productName")) {
            product.slug = slugify(product.productName, { lower: true, strict: true });
          }
        },
      },
    }
  );

  return Product;
};
