"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Store extends Model {
    static associate(models) {
      Store.hasMany(models.Order, {
        foreignKey: "storeId",
        as: "orders",
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      });
      // một cửa hàng có nhiều bản ghi sản phẩm
      Store.hasMany(models.StoreProduct, {
        foreignKey: "storeId",
        as: "storeProducts",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });

      //Quan hệ nhiều-nhiều với Product thông qua StoreProduct
      Store.belongsToMany(models.Product, {
        through: models.StoreProduct,
        foreignKey: "storeId",
        otherKey: "productId",
        as: "products",
      });
    }
    get mapUrl() {
      return `https://maps.google.com/?q=${this.latitude},${this.longitude}`;
    }
  }
  Store.init(
    {
      storeId: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      storeName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      storeAddress: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      storePhoneNumber: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      longitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: false,
      },
      latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("active", "inactive"),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Store",
    }
  );
  return Store;
};
