"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable("OrderItems", {
            orderId: {
                type: Sequelize.UUID,
                allowNull: false, // Ràng buộc NOT NULL
                references: {
                    model: "Orders", // Bảng Orders
                    key: "orderId", // Khóa ngoại tham chiếu orderId trong bảng Orders
                },
                onDelete: "CASCADE", // Xóa các mục khi đơn hàng bị xóa
                onUpdate: "CASCADE", // Cập nhật khi orderId thay đổi
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
            orderQuantity: {
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
        await queryInterface.addConstraint("OrderItems", {
            fields: ["orderId", "productId"],
            type: "primary key",
            name: "PK_OrderItems", // Tên constraint
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable("OrderItems");
    },
};
