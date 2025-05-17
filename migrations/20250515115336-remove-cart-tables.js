"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Kiểm tra xem cơ sở dữ liệu là MySQL hay PostgreSQL
    const isMySQL = queryInterface.sequelize.options.dialect === "mysql";

    try {
      // Bước 1: Xóa bảng CartItems trước (bảng con)
      // MySQL sẽ tự động xóa các ràng buộc khóa ngoại khi xóa bảng
      await queryInterface.dropTable("CartItems", { cascade: true });
      console.log("Successfully dropped CartItems table");

      // Bước 2: Xóa bảng Carts
      await queryInterface.dropTable("Carts", { cascade: true });
      console.log("Successfully dropped Carts table");
    } catch (error) {
      console.error("Error dropping tables:", error);
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      // Khôi phục bảng Cart
      await queryInterface.createTable("Carts", {
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
          // Trong MySQL, ENUM là trực tiếp, không cần tên kiểu
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
      console.log("Successfully created Carts table");

      // Khôi phục bảng CartItems
      await queryInterface.createTable("CartItems", {
        cartItemId: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        cartId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: "Carts",
            key: "cartId",
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
        quantity: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1,
        },
        price: {
          type: Sequelize.DECIMAL(15, 2),
          allowNull: false,
        },
        finalPrice: {
          type: Sequelize.DECIMAL(15, 2),
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
      console.log("Successfully created CartItems table");
    } catch (error) {
      console.error("Error creating tables:", error);
    }
  },
};
