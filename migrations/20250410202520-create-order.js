"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable("Orders", {
            orderId: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true,
                allowNull: false, // Ràng buộc NOT NULL
            },
            userId: {
                type: Sequelize.UUID,
                allowNull: true, // Có thể NULL
                references: {
                    model: "Users", // Bảng Users
                    key: "userId", // Khóa ngoại tham chiếu userId trong bảng Users
                },
                onDelete: "SET NULL", // Khi User bị xóa, đặt NULL
                onUpdate: "CASCADE", // Khi User thay đổi, cập nhật
            },
            customerName: {
                type: Sequelize.STRING,
                allowNull: false, // Ràng buộc NOT NULL
            },
            phoneNumber: {
                type: Sequelize.STRING,
                allowNull: false, // Ràng buộc NOT NULL
            },
            address: {
                type: Sequelize.STRING,
                allowNull: false, // Ràng buộc NOT NULL
            },
            deliveryDay: {
                type: Sequelize.DATE,
                allowNull: false, // Ràng buộc NOT NULL
            },
            deliveryTime: {
                type: Sequelize.TIME,
                allowNull: false, // Ràng buộc NOT NULL
            },
            status: {
                type: Sequelize.ENUM("Pending", "Shipped", "Delivered", "Cancelled"),
                allowNull: false, // Ràng buộc NOT NULL
            },
            paymentMethod: {
                type: Sequelize.ENUM("Cash", "Credit Card", "Bank Transfer"),
                allowNull: false, // Ràng buộc NOT NULL
            },
            storeId: {
                type: Sequelize.UUID,
                allowNull: true, // Có thể NULL
                references: {
                    model: "Stores", // Bảng Store
                    key: "storeId", // Khóa ngoại tham chiếu storeId trong bảng Stores
                },
                onDelete: "SET NULL", // Khi Store bị xóa, đặt NULL
                onUpdate: "CASCADE", // Khi Store thay đổi, cập nhật
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
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable("Orders");
    },
};
