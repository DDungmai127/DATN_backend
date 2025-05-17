"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class StoreProduct extends Model {
    static associate(models) {
      StoreProduct.belongsTo(models.Store, {
        foreignKey: "storeId",
        as: "store",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });

      // Quan hệ với Product
      StoreProduct.belongsTo(models.Product, {
        foreignKey: "productId",
        as: "product",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });
    }
  }
  StoreProduct.init(
    {
      storeId: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true, // Là một phần của khóa chính tổng hợp
      },
      productId: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true, // Là một phần của khóa chính tổng hợp
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "StoreProduct",
      tableName: "StoreProducts",
      timestamps: true, // Tự động thêm createdAt và updatedAt
    }
  );
  return StoreProduct;
};
