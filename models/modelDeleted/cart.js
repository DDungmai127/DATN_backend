"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class Cart extends Model {
        static associate(models) {
            // Quan hệ 1-n với Cart_Items
            Cart.hasMany(models.CartItem, {
                foreignKey: "cartId",
                as: "cartItems",
                onDelete: "CASCADE",
                onUpdate: "CASCADE",
            });

            // Quan hệ với Users
            Cart.belongsTo(models.User, {
                foreignKey: "userId",
                as: "user",
                onDelete: "SET NULL",
                onUpdate: "CASCADE",
            });
        }
        get displayId() {
            return `CART${this.cartId.substring(0, 4)}`;
        }
    }
    Cart.init(
        {
            cartId: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            userId: {
                type: DataTypes.UUID,
                allowNull: true,
                comment: "ID người dùng, null nếu là khách vãng lai",
            },
            guestIdentifier: {
                type: DataTypes.STRING,
                allowNull: true,
                comment: "Định danh cho khách vãng lai (có thể lưu sessionId hoặc fingerprint)",
            },
            status: {
                type: DataTypes.ENUM("active", "abandoned", "merged", "converted_to_order"),
                defaultValue: "active",
                allowNull: false,
                comment: "Trạng thái giỏ hàng: đang hoạt động, bỏ rơi, đã hợp nhất, đã đặt hàng",
            },
            lastActivity: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW,
                allowNull: false,
                comment: "Thời điểm hoạt động cuối cùng của giỏ hàng",
            },

            expiresAt: {
                type: DataTypes.DATE,
                allowNull: true,
                comment: "Thời điểm giỏ hàng hết hạn (chỉ áp dụng cho khách vãng lai)",
            },
        },
        {
            sequelize,
            modelName: "Cart",
            hooks: {
                beforeCreate: (cart) => {
                    // Thiết lập thời gian hết hạn cho giỏ hàng của khách vãng lai
                    if (!cart.userId && !cart.expiresAt) {
                        const expiryDate = new Date();
                        expiryDate.setDate(expiryDate.getDate() + 30); // 30 ngày
                        cart.expiresAt = expiryDate;
                    }
                },
                beforeUpdate: (cart) => {
                    // Cập nhật thời gian hoạt động cuối cùng
                    cart.lastActivity = new Date();
                },
            },
        }
    );
    return Cart;
};
