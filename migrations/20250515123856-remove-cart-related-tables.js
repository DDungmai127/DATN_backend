"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Tắt kiểm tra khóa ngoại
      await queryInterface.sequelize.query("SET FOREIGN_KEY_CHECKS = 0");

      // Kiểm tra và xóa bảng CartItems/CartItem trước
      try {
        await queryInterface.sequelize.query("DROP TABLE IF EXISTS `CartItems`");
        console.log("CartItems table dropped (if existed)");
      } catch (error) {
        console.log("Error dropping CartItems table:", error.message);
      }

      try {
        await queryInterface.sequelize.query("DROP TABLE IF EXISTS `CartItem`");
        console.log("CartItem table dropped (if existed)");
      } catch (error) {
        console.log("Error dropping CartItem table:", error.message);
      }

      // Xóa bảng Cart/Carts
      try {
        await queryInterface.sequelize.query("DROP TABLE IF EXISTS `Carts`");
        console.log("Carts table dropped (if existed)");
      } catch (error) {
        console.log("Error dropping Carts table:", error.message);
      }

      try {
        await queryInterface.sequelize.query("DROP TABLE IF EXISTS `Cart`");
        console.log("Cart table dropped (if existed)");
      } catch (error) {
        console.log("Error dropping Cart table:", error.message);
      }

      // Bật lại kiểm tra khóa ngoại
      await queryInterface.sequelize.query("SET FOREIGN_KEY_CHECKS = 1");
    } catch (error) {
      // Đảm bảo bật lại kiểm tra khóa ngoại ngay cả khi có lỗi
      await queryInterface.sequelize.query("SET FOREIGN_KEY_CHECKS = 1");
      console.error("Error in migration:", error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    // Chúng ta quyết định không phục hồi các bảng này
    console.log("This migration cannot be undone");
  },
};
