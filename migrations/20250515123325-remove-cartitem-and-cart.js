"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // 1. Tắt kiểm tra khóa ngoại tạm thời
      await queryInterface.sequelize.query("SET FOREIGN_KEY_CHECKS = 0");

      // 2. Xóa bảng CartItem trước (lưu ý tên bảng trong init là "CartItem")
      await queryInterface.sequelize.query("DROP TABLE IF EXISTS `CartItem`");
      console.log("Successfully dropped CartItem table");

      // 3. Xóa bảng Cart sau
      await queryInterface.sequelize.query("DROP TABLE IF EXISTS `Cart`");
      console.log("Successfully dropped Cart table");

      // 4. Bật lại kiểm tra khóa ngoại
      await queryInterface.sequelize.query("SET FOREIGN_KEY_CHECKS = 1");
    } catch (error) {
      // Đảm bảo bật lại kiểm tra khóa ngoại ngay cả khi có lỗi
      try {
        await queryInterface.sequelize.query("SET FOREIGN_KEY_CHECKS = 1");
      } catch (e) {
        console.error("Error re-enabling foreign key checks:", e);
      }

      console.error("Error dropping tables:", error);
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      // 1. Tạo lại bảng Cart trước
      await queryInterface.createTable("Cart", {
        cartId: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        userId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: "Users",
            key: "userId",
          },
          onDelete: "SET NULL",
          onUpdate: "CASCADE",
        },
        guestIdentifier: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        status: {
          type: Sequelize.ENUM("active", "abandoned", "merged", "converted_to_order"),
          defaultValue: "active",
          allowNull: false,
        },
        lastActivity: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW,
          allowNull: false,
        },
        expiresAt: {
          type: Sequelize.DATE,
          allowNull: true,
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
      console.log("Successfully created Cart table");

      // 2. Tạo lại bảng CartItem sau
      await queryInterface.createTable("CartItem", {
        cartId: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          references: {
            model: "Cart",
            key: "cartId",
          },
          onDelete: "CASCADE",
          onUpdate: "CASCADE",
        },
        productId: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          references: {
            model: "Products",
            key: "productId",
          },
          onDelete: "CASCADE",
          onUpdate: "CASCADE",
        },
        cartQuantity: {
          type: Sequelize.INTEGER,
          allowNull: false,
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
      console.log("Successfully created CartItem table");
    } catch (error) {
      console.error("Error creating tables:", error);
    }
  },
};
