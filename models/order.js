"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Order extends Model {
    static associate(models) {
      // Quan hệ 1-n với OrderItems
      Order.hasMany(models.OrderItem, {
        foreignKey: "orderId",
        as: "orderItems",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });

      // Quan hệ với Users
      Order.belongsTo(models.User, {
        foreignKey: "userId",
        as: "user",
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      });
      Order.belongsTo(models.Store, {
        foreignKey: "storeId",
        as: "store",
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      });
    }
    get displayId() {
      return `ORD${this.orderId.substring(0, 4)}`;
    }
  }
  Order.init(
    {
      orderId: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      customerName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      phoneNumber: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      address: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      deliveryDay: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      deliveryTime: {
        type: DataTypes.TIME,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("Chờ xử lý", "Đang giao hàng", "Đã giao hàng", "Đã hủy"),
        allowNull: false,
      },
      paymentMethod: {
        type: DataTypes.ENUM("Tiền mặt", "Thẻ tín dụng", "Chuyển khoản"),
        allowNull: false,
      },
      storeId: {
        // Thêm trường storeId vào model
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Order",
    }
  );
  return Order;
};
