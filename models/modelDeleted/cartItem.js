"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class CartItem extends Model {
        static associate(models) {
            // Quan hệ với Cart
            CartItem.belongsTo(models.Cart, {
                foreignKey: "cartId",
                as: "cart",
                onDelete: "CASCADE",
                onUpdate: "CASCADE",
            });

            // Quan hệ với Product
            CartItem.belongsTo(models.Product, {
                foreignKey: "productId",
                as: "product",
                onDelete: "CASCADE",
                onUpdate: "CASCADE",
            });
        }
    }
    CartItem.init(
        {
            cartId: {
                type: DataTypes.UUID,
                allowNull: false,
                primaryKey: true, // Thiết lập làm khóa chính (phần của composite primary key)
            },
            productId: {
                type: DataTypes.UUID,
                allowNull: false,
                primaryKey: true, // Thiết lập làm khóa chính (phần của composite primary key)
            },
            cartQuantity: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
        },
        {
            sequelize,
            modelName: "CartItem", // Tên model
            tableName: "CartItem", // Tên bảng trong cơ sở dữ liệu
            timestamps: true, // Tự động thêm createdAt và updatedAt
        }
    );
    return CartItem;
};
