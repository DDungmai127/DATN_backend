"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Category extends Model {
    static associate(models) {
      Category.hasMany(models.DetailCategory, {
        foreignKey: "categoryId",
        as: "detailCategories",
      });

      Category.hasMany(models.Product, {
        foreignKey: "categoryId",
        as: "products",
      });
    }
    get displayId() {
      return `CAT${this.categoryId.substring(0, 4)}`;
    }
  }
  Category.init(
    {
      categoryId: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      categoryName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      categoryImage: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "Category",
    }
  );
  return Category;
};
