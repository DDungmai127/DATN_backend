"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Bước 1: Tạo bảng tạm thời để lưu trữ dữ liệu hiện tại
    await queryInterface.createTable("InventoryTemp", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      storeId: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      productId: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      expirationDate: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // Bước 2: Sao chép dữ liệu từ bảng cũ sang bảng tạm (cú pháp MySQL)
    await queryInterface.sequelize.query(
      `INSERT INTO InventoryTemp (id, storeId, productId, quantity, expirationDate, createdAt, updatedAt) 
       SELECT UUID(), storeId, productId, quantity, expirationDate, createdAt, updatedAt 
       FROM Inventory;`
    );

    // Bước 3: Xóa bảng cũ
    await queryInterface.dropTable("Inventory");

    // Bước 4: Tạo lại bảng với cấu trúc mới
    await queryInterface.createTable("Inventory", {
      inventoryId: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      storeId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "Stores",
          key: "storeId",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      productId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "Products",
          key: "productId",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      batchNumber: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      expirationDate: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // Bước 5: Sao chép dữ liệu từ bảng tạm sang bảng mới (cú pháp MySQL)
    await queryInterface.sequelize.query(
      `INSERT INTO Inventory (inventoryId, storeId, productId, quantity, expirationDate, createdAt, updatedAt) 
       SELECT id, storeId, productId, quantity, expirationDate, createdAt, updatedAt 
       FROM InventoryTemp;`
    );

    // Bước 6: Tạo index để tối ưu truy vấn
    await queryInterface.addIndex("Inventory", ["storeId", "productId"], {
      name: "inventory_store_product_index",
    });

    await queryInterface.addIndex("Inventory", ["productId"], {
      name: "inventory_product_index",
    });

    await queryInterface.addIndex("Inventory", ["expirationDate"], {
      name: "inventory_expiration_index",
    });

    // Bước 7: Xóa bảng tạm
    await queryInterface.dropTable("InventoryTemp");
  },

  down: async (queryInterface, Sequelize) => {
    // Bước 1: Tạo bảng tạm thời để lưu trữ dữ liệu hiện tại
    await queryInterface.createTable("InventoryTemp", {
      storeId: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      productId: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      expirationDate: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // Bước 2: Sao chép dữ liệu từ bảng mới sang bảng tạm (cú pháp MySQL)
    // MySQL không có DISTINCT ON, nên cần viết lại
    await queryInterface.sequelize.query(
      `INSERT INTO InventoryTemp (storeId, productId, quantity, expirationDate, createdAt, updatedAt) 
       SELECT t.storeId, t.productId, t.quantity, t.expirationDate, t.createdAt, t.updatedAt 
       FROM (
         SELECT storeId, productId, quantity, expirationDate, createdAt, updatedAt,
                ROW_NUMBER() OVER (PARTITION BY storeId, productId ORDER BY createdAt) as rn
         FROM Inventory
       ) t 
       WHERE t.rn = 1;`
    );

    // Bước 3: Xóa bảng mới
    await queryInterface.dropTable("Inventory");

    // Bước 4: Tạo lại bảng với cấu trúc cũ
    await queryInterface.createTable("Inventory", {
      storeId: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        references: {
          model: "Stores",
          key: "storeId",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      productId: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        references: {
          model: "Products",
          key: "productId",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      expirationDate: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // Bước 5: Sao chép dữ liệu từ bảng tạm sang bảng mới (cú pháp MySQL)
    await queryInterface.sequelize.query(
      `INSERT INTO Inventory (storeId, productId, quantity, expirationDate, createdAt, updatedAt) 
       SELECT storeId, productId, quantity, expirationDate, createdAt, updatedAt 
       FROM InventoryTemp;`
    );

    // Bước 6: Xóa bảng tạm
    await queryInterface.dropTable("InventoryTemp");
  },
};
