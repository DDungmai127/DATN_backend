"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Đổi tên bảng từ StoreProducts thành Inventory
      await queryInterface.renameTable("StoreProducts", "Inventory");
      console.log("Successfully renamed table from StoreProducts to Inventory");
    } catch (error) {
      console.error("Error renaming table:", error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      // Đổi tên trở lại từ Inventory thành StoreProducts nếu cần rollback
      await queryInterface.renameTable("Inventory", "StoreProducts");
      console.log("Successfully renamed table back from Inventory to StoreProducts");
    } catch (error) {
      console.error("Error renaming table back:", error);
      throw error;
    }
  },
};
