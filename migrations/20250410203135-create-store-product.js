"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable("StoreProducts", {
            storeId: {
                type: Sequelize.UUID,
                allowNull: false, // Ràng buộc NOT NULL
                references: {
                    model: "Stores", // Bảng Stores
                    key: "storeId", // Khóa ngoại tham chiếu storeId trong bảng Stores
                },
                onDelete: "CASCADE", // Xóa các mục khi Store bị xóa
                onUpdate: "CASCADE", // Cập nhật khi storeId thay đổi
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
            quantity: {
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
        await queryInterface.addConstraint("StoreProducts", {
            fields: ["storeId", "productId"],
            type: "primary key",
            name: "PK_StoreProducts", // Tên constraint
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable("StoreProducts");
    },
};
