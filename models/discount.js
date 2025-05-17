"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Discount extends Model {
    static associate(models) {
      // Liên kết với bảng Products
      Discount.hasMany(models.Product, {
        foreignKey: "discountId",
        as: "products",
      });
    }
  }

  Discount.init(
    {
      DiscountId: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      DiscountName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      DiscountValue: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      StartDate: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      EndDate: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      IsActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "Discount",
      timestamps: false,
    }
  );

  return Discount;
};
