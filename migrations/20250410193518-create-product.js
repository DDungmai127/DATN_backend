"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable("Products", {
            productId: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true,
                allowNull: false, // Ràng buộc NOT NULL
            },
            productName: {
                type: Sequelize.STRING,
                allowNull: false, // Ràng buộc NOT NULL
            },
            description: {
                type: Sequelize.STRING,
                allowNull: false, // Ràng buộc NOT NULL
            },
            imageUrl: {
                type: Sequelize.STRING,
                allowNull: false, // Ràng buộc NOT NULL
            },
            providerName: {
                type: Sequelize.STRING,
                allowNull: true, // Có thể NULL
            },
            price: {
                type: Sequelize.INTEGER,
                allowNull: false, // Ràng buộc NOT NULL
            },
            unitOfMeasurement: {
                type: Sequelize.STRING,
                allowNull: false, // Ràng buộc NOT NULL
            },
            quantity: {
                type: Sequelize.INTEGER,
                allowNull: false, // Ràng buộc NOT NULL
            },
            expirationDate: {
                type: Sequelize.DATE,
                allowNull: false, // Ràng buộc NOT NULL
            },
            status: {
                type: Sequelize.ENUM("active", "not active"), // ENUM giá trị
                allowNull: true, // Có thể NULL
            },
            categoryId: {
                type: Sequelize.UUID,
                allowNull: true, // Có thể NULL
                references: {
                    model: "Categories", // Tên bảng tham chiếu
                    key: "categoryId", // Khóa tham chiếu
                },
                onDelete: "SET NULL", // Khi Category bị xóa, đặt NULL
                onUpdate: "CASCADE", // Khi Category thay đổi, cập nhật
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
        await queryInterface.dropTable("Products");
    },
};
