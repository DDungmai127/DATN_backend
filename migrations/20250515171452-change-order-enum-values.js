"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Bước 1: Xử lý dữ liệu hiện tại để đảm bảo không mất khi đổi enum
      // Map giá trị tiếng Anh sang tiếng Việt
      await queryInterface.sequelize.query(`
        UPDATE Orders SET status = 
          CASE 
            WHEN status = 'Pending' THEN 'Chờ xử lý' 
            WHEN status = 'Shipped' THEN 'Đang giao hàng' 
            WHEN status = 'Delivered' THEN 'Đã giao hàng' 
            WHEN status = 'Cancelled' THEN 'Đã hủy' 
            ELSE status 
          END;
      `);

      await queryInterface.sequelize.query(`
        UPDATE Orders SET paymentMethod = 
          CASE 
            WHEN paymentMethod = 'Cash' THEN 'Tiền mặt' 
            WHEN paymentMethod = 'Credit Card' THEN 'Thẻ tín dụng' 
            WHEN paymentMethod = 'Bank Transfer' THEN 'Chuyển khoản' 
            ELSE paymentMethod 
          END;
      `);

      // Bước 2: Sửa đổi kiểu dữ liệu ENUM
      await queryInterface.sequelize.query(`
        ALTER TABLE Orders 
        MODIFY COLUMN status ENUM('Chờ xử lý', 'Đang giao hàng', 'Đã giao hàng', 'Đã hủy') 
        NOT NULL;
      `);

      await queryInterface.sequelize.query(`
        ALTER TABLE Orders 
        MODIFY COLUMN paymentMethod ENUM('Tiền mặt', 'Thẻ tín dụng', 'Chuyển khoản') 
        NOT NULL;
      `);

      console.log("Successfully updated Order ENUM values to Vietnamese");
    } catch (error) {
      console.error("Error updating Order ENUM values:", error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      // Bước 1: Xử lý dữ liệu hiện tại để đảm bảo không mất khi đổi enum
      // Map giá trị tiếng Việt về tiếng Anh
      await queryInterface.sequelize.query(`
        UPDATE Orders SET status = 
          CASE 
            WHEN status = 'Chờ xử lý' THEN 'Pending' 
            WHEN status = 'Đang giao hàng' THEN 'Shipped' 
            WHEN status = 'Đã giao hàng' THEN 'Delivered' 
            WHEN status = 'Đã hủy' THEN 'Cancelled' 
            ELSE status 
          END;
      `);

      await queryInterface.sequelize.query(`
        UPDATE Orders SET paymentMethod = 
          CASE 
            WHEN paymentMethod = 'Tiền mặt' THEN 'Cash' 
            WHEN paymentMethod = 'Thẻ tín dụng' THEN 'Credit Card' 
            WHEN paymentMethod = 'Chuyển khoản' THEN 'Bank Transfer' 
            ELSE paymentMethod 
          END;
      `);

      // Bước 2: Sửa đổi kiểu dữ liệu ENUM về tiếng Anh
      await queryInterface.sequelize.query(`
        ALTER TABLE Orders 
        MODIFY COLUMN status ENUM('Pending', 'Shipped', 'Delivered', 'Cancelled') 
        NOT NULL;
      `);

      await queryInterface.sequelize.query(`
        ALTER TABLE Orders 
        MODIFY COLUMN paymentMethod ENUM('Cash', 'Credit Card', 'Bank Transfer') 
        NOT NULL;
      `);

      console.log("Successfully reverted Order ENUM values to English");
    } catch (error) {
      console.error("Error reverting Order ENUM values:", error);
      throw error;
    }
  },
};
