"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Inventory extends Model {
    static associate(models) {
      // Quan hệ với Store
      Inventory.belongsTo(models.Store, {
        foreignKey: "storeId",
        as: "store",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });

      // Quan hệ với Product
      Inventory.belongsTo(models.Product, {
        foreignKey: "productId",
        as: "product",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });
    }
  }

  Inventory.init(
    {
      inventoryId: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      storeId: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
      },
      productId: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      expirationDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Inventory",
      tableName: "Inventory", // Đổi tên bảng ở đây
      timestamps: true,
    }
  );

  return Inventory;
};
