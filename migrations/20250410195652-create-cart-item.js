"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable("CartItem", {
            cartId: {
                type: Sequelize.UUID,
                allowNull: false, // Ràng buộc NOT NULL
                references: {
                    model: "Carts", // Bảng Carts
                    key: "cartId", // Khóa ngoại tham chiếu cartId trong bảng Carts
                },
                onDelete: "CASCADE", // Xóa các mục giỏ hàng khi giỏ hàng bị xóa
                onUpdate: "CASCADE", // Cập nhật khi cartId thay đổi
            },
            productId: {
                type: Sequelize.UUID,
                allowNull: false, // Ràng buộc NOT NULL
                references: {
                    model: "Products", // Bảng Products
                    key: "productId", // Khóa ngoại tham chiếu productId trong bảng Products
                },
                onDelete: "CASCADE", // Xóa khi Product bị xóa
                onUpdate: "CASCADE", // Cập nhật khi productId thay đổi
            },
            cartQuantity: {
                type: Sequelize.INTEGER,
                allowNull: false, // Ràng buộc NOT NULL
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE,
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE,
            },
        });

        // Định nghĩa khóa chính tổng hợp (Composite Primary Key)
        await queryInterface.addConstraint("CartItem", {
            fields: ["cartId", "productId"],
            type: "primary key",
            name: "PK_CartItem", // Tên constraint
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable("CartItem");
    },
};
