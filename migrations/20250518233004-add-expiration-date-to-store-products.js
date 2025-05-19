"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Thêm trường expirationDate vào bảng StoreProducts
      await queryInterface.addColumn("StoreProducts", "expirationDate", {
        type: Sequelize.DATE,
        allowNull: true, // Đặt allowNull: true để không ảnh hưởng đến dữ liệu hiện có
      });

      console.log("Successfully added expirationDate column to StoreProducts table");
    } catch (error) {
      console.error("Error adding expirationDate column:", error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      // Xóa trường expirationDate nếu cần rollback
      await queryInterface.removeColumn("StoreProducts", "expirationDate");
      console.log("Successfully removed expirationDate column from StoreProducts table");
    } catch (error) {
      console.error("Error removing expirationDate column:", error);
      throw error;
    }
  },
};
