"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable("DetailCategories", {
            DetailCategoryID: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true,
                allowNull: false,
                comment: "ID của chi tiết phân loại danh mục.",
            },
            DetailType: {
                type: Sequelize.STRING,
                allowNull: false,
                comment: "Phân loại.",
            },
            DetailValue: {
                type: Sequelize.STRING,
                allowNull: false,
                comment: "Giá trị của phân loại.",
            },
            CategoryID: {
                type: Sequelize.UUID,
                allowNull: true,
                references: {
                    model: "Categories", // Tên bảng tham chiếu
                    key: "categoryId", // Khóa chính trong bảng tham chiếu
                },
                onDelete: "SET NULL", // Khi Category bị xóa, đặt NULL
                onUpdate: "CASCADE", // Khi Category thay đổi, cập nhật
                comment: "ID của thể loại hàng nó phụ thuộc.",
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
        await queryInterface.dropTable("DetailCategories");
    },
};
