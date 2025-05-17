"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable("Users", {
            userId: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true,
                allowNull: false,
                unique: true, // Ràng buộc UNIQUE
            },
            password: {
                type: Sequelize.STRING,
                allowNull: false, // Ràng buộc NOT NULL
            },
            phoneNumber: {
                type: Sequelize.STRING,
                allowNull: false, // Ràng buộc NOT NULL
                unique: true, // Ràng buộc UNIQUE
            },
            fullName: {
                type: Sequelize.STRING,
                allowNull: false, // Ràng buộc NOT NULL
            },
            gender: {
                type: Sequelize.ENUM("Nam", "Nữ"), // Giá trị ENUM
                allowNull: false, // Ràng buộc NOT NULL
            },
            dateOfBirth: {
                type: Sequelize.DATE,
                allowNull: true, // Có thể NULL
            },
            email: {
                type: Sequelize.STRING,
                allowNull: true, // Có thể NULL
            },
            address: {
                type: Sequelize.STRING,
                allowNull: true, // Có thể NULL
            },
            role: {
                type: Sequelize.ENUM("customer", "admin"), // Giá trị ENUM
                allowNull: false, // Ràng buộc NOT NULL
            },
            createdAt: {
                allowNull: false, // Ràng buộc NOT NULL
                type: Sequelize.DATE,
            },
            updatedAt: {
                allowNull: false, // Ràng buộc NOT NULL
                type: Sequelize.DATE,
            },
        });
    },

    down: async (queryInterface, Sequelize) => {
        // Xóa bảng nếu rollback
        await queryInterface.dropTable("Users");
    },
};
