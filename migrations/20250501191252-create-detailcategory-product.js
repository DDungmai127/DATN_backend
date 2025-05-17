"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable("DetailCategory_Product", {
            DetailCategoryID: {
                type: Sequelize.UUID,
                allowNull: false,
                primaryKey: true,
                references: {
                    model: "DetailCategories", // Tên bảng tham chiếu
                    key: "DetailCategoryID", // Khóa chính trong bảng tham chiếu
                },
                onDelete: "CASCADE", // Khi DetailCategory bị xóa, xóa luôn bản ghi liên kết
                onUpdate: "CASCADE", // Khi DetailCategory thay đổi, cập nhật
                comment: "Khoá liên kết tới bảng DetailCategories.",
            },
            ProductID: {
                type: Sequelize.UUID,
                allowNull: false,
                primaryKey: true,
                references: {
                    model: "Products", // Tên bảng tham chiếu
                    key: "productId", // Khóa chính trong bảng tham chiếu
                },
                onDelete: "CASCADE", // Khi Product bị xóa, xóa luôn bản ghi liên kết
                onUpdate: "CASCADE", // Khi Product thay đổi, cập nhật
                comment: "Khoá liên kết tới bảng Products.",
            },
            createdAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.NOW,
            },
            updatedAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.NOW,
            },
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable("DetailCategory_Product");
    },
};
