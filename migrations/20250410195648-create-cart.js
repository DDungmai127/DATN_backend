"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable("Carts", {
            cartId: {
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
        await queryInterface.dropTable("Carts");
    },
};
