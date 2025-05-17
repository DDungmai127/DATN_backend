"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable("Discounts", {
            DiscountId: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4, // Generate UUID automatically
                primaryKey: true,
                allowNull: false,
            },
            DiscountName: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            DiscountValue: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            StartDate: {
                type: Sequelize.DATE,
                allowNull: false,
            },
            EndDate: {
                type: Sequelize.DATE,
                allowNull: false,
            },
            IsActive: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: true, // Default trạng thái khuyến mãi là "active"
            },
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable("Discounts");
    },
};
