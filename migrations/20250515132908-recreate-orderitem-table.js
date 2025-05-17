"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Bước 1: Tắt kiểm tra khóa ngoại
      await queryInterface.sequelize.query("SET FOREIGN_KEY_CHECKS = 0");

      // Bước 2: Xóa bảng OrderItems hiện tại
      await queryInterface.dropTable("OrderItems", { cascade: true });
      console.log("Successfully dropped old OrderItems table");

      // Bước 3: Tạo lại bảng OrderItems với cấu trúc mới
      await queryInterface.createTable("OrderItems", {
        orderItemId: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        orderId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: "Orders",
            key: "orderId",
          },
          onDelete: "CASCADE",
          onUpdate: "CASCADE",
        },
        productId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: "Products",
            key: "productId",
          },
          onDelete: "CASCADE",
          onUpdate: "CASCADE",
        },
        orderQuantity: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
        },
      });

      // Bước 4: Tạo index duy nhất cho cặp orderId và productId
      await queryInterface.addIndex("OrderItems", ["orderId", "productId"], {
        unique: true,
        name: "OrderItems_orderId_productId_unique",
      });

      // Bước 5: Bật lại kiểm tra khóa ngoại
      await queryInterface.sequelize.query("SET FOREIGN_KEY_CHECKS = 1");

      console.log("Successfully created new OrderItems table");
    } catch (error) {
      // Đảm bảo bật lại kiểm tra khóa ngoại ngay cả khi có lỗi
      try {
        await queryInterface.sequelize.query("SET FOREIGN_KEY_CHECKS = 1");
      } catch (innerError) {
        console.error("Error re-enabling foreign key checks:", innerError);
      }

      console.error("Error recreating OrderItems table:", error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      // Bước 1: Tắt kiểm tra khóa ngoại
      await queryInterface.sequelize.query("SET FOREIGN_KEY_CHECKS = 0");

      // Bước 2: Xóa bảng OrderItems với cấu trúc mới
      await queryInterface.dropTable("OrderItems", { cascade: true });

      // Bước 3: Tạo lại bảng OrderItems với cấu trúc cũ
      await queryInterface.createTable("OrderItems", {
        orderId: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          references: {
            model: "Orders",
            key: "orderId",
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
        orderQuantity: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
        },
      });

      // Bước 4: Bật lại kiểm tra khóa ngoại
      await queryInterface.sequelize.query("SET FOREIGN_KEY_CHECKS = 1");

      console.log("Successfully reverted OrderItems table to original structure");
    } catch (error) {
      // Đảm bảo bật lại kiểm tra khóa ngoại ngay cả khi có lỗi
      try {
        await queryInterface.sequelize.query("SET FOREIGN_KEY_CHECKS = 1");
      } catch (innerError) {
        console.error("Error re-enabling foreign key checks:", innerError);
      }

      console.error("Error reverting OrderItems table:", error);
      throw error;
    }
  },
};
