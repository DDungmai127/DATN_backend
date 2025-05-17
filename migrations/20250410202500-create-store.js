"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable("Stores", {
            storeId: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true,
                allowNull: false, // Ràng buộc NOT NULL
            },
            storeName: {
                type: Sequelize.STRING,
                allowNull: false, // Ràng buộc NOT NULL
            },
            storeAddress: {
                type: Sequelize.STRING,
                allowNull: false, // Ràng buộc NOT NULL
            },
            storePhoneNumber: {
                type: Sequelize.STRING,
                allowNull: false, // Ràng buộc NOT NULL
            },
            longitude: {
                type: Sequelize.DECIMAL(10, 8),
                allowNull: false, // Ràng buộc NOT NULL
            },
            latitude: {
                type: Sequelize.DECIMAL(10, 8),
                allowNull: false, // Ràng buộc NOT NULL
            },
            status: {
                type: Sequelize.ENUM("active", "inactive"),
                allowNull: true, // Có thể NULL
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
        await queryInterface.dropTable("Stores");
    },
};
