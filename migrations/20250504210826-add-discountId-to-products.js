"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn("Products", "discountId", {
            type: Sequelize.UUID,
            allowNull: true,
            references: {
                model: "Discounts",
                key: "DiscountId",
            },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn("Products", "discountId");
    },
};
