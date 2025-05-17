"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable("Categories", {
            categoryId: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            categoryName: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            description: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            categoryImage: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            parentCategoryId: {
                type: Sequelize.UUID,
                allowNull: true,
                references: {
                    model: "Categories", // Self-referencing foreign key
                    key: "categoryId",
                },
                onDelete: "SET NULL", // Set to NULL if parent is deleted
                onUpdate: "CASCADE", // Update child if parent changes
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
        await queryInterface.dropTable("Categories");
    },
};
