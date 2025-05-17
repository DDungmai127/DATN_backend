"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn("Carts", "guestIdentifier", {
            type: Sequelize.STRING,
            allowNull: true,
        });

        await queryInterface.addColumn("Carts", "status", {
            type: Sequelize.ENUM("active", "abandoned", "merged", "converted_to_order"),
            defaultValue: "active",
            allowNull: false,
        });

        await queryInterface.addColumn("Carts", "lastActivity", {
            type: Sequelize.DATE,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
            allowNull: false,
        });

        await queryInterface.addColumn("Carts", "expiresAt", {
            type: Sequelize.DATE,
            allowNull: true,
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn("Carts", "guestIdentifier");
        await queryInterface.removeColumn("Carts", "status");
        await queryInterface.removeColumn("Carts", "lastActivity");
        await queryInterface.removeColumn("Carts", "expiresAt");

        // Xóa ENUM type sau khi xóa cột
        await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Carts_status";');
    },
};
