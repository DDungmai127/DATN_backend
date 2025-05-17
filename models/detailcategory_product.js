"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class DetailCategory_Product extends Model {
        /**
         * Định nghĩa các liên kết (associations) nếu cần
         */
        static associate(models) {
            // Liên kết với bảng DetailCategories
            DetailCategory_Product.belongsTo(models.DetailCategory, {
                foreignKey: "DetailCategoryID",
                as: "detailCategory",
                onDelete: "CASCADE",
                onUpdate: "CASCADE",
            });

            // Liên kết với bảng Products
            DetailCategory_Product.belongsTo(models.Product, {
                foreignKey: "ProductID",
                as: "product",
                onDelete: "CASCADE",
                onUpdate: "CASCADE",
            });
        }
    }

    DetailCategory_Product.init(
        {
            DetailCategoryID: {
                type: DataTypes.UUID,
                allowNull: false,
                primaryKey: true,
                comment: "Khoá liên kết tới bảng DetailCategories.",
            },
            ProductID: {
                type: DataTypes.UUID,
                allowNull: false,
                primaryKey: true,
                comment: "Khoá liên kết tới bảng Products.",
            },
        },
        {
            sequelize,
            modelName: "DetailCategory_Product",
            tableName: "DetailCategory_Product", // Tên bảng
            timestamps: true, // Tự động thêm createdAt và updatedAt
        }
    );

    return DetailCategory_Product;
};
