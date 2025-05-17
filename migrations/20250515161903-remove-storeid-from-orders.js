"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Xóa trường storeId khỏi bảng Orders
      await queryInterface.removeColumn("Orders", "storeId");
      console.log("Successfully removed storeId column from Orders table");
    } catch (error) {
      console.error("Error removing storeId column:", error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      // Thêm lại trường storeId nếu cần rollback
      await queryInterface.addColumn("Orders", "storeId", {
        type: Sequelize.UUID,
        allowNull: true,
      });
      console.log("Successfully added back storeId column to Orders table");
    } catch (error) {
      console.error("Error adding back storeId column:", error);
      throw error;
    }
  },
};
