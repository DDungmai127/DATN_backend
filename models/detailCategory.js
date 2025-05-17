"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class DetailCategory extends Model {
        /**
         * Định nghĩa các liên kết (associations) nếu cần
         */
        static associate(models) {
            DetailCategory.belongsTo(models.Category, {
                foreignKey: "CategoryId",
                as: "category",
            });

            DetailCategory.belongsToMany(models.Product, {
                through: "DetailCategory_Product",
                foreignKey: "DetailCategoryId",
                otherKey: "productId",
                as: "products",
            });
        }
    }

    DetailCategory.init(
        {
            DetailCategoryId: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
                comment: "ID của chi tiết phân loại danh mục.",
            },
            DetailType: {
                type: DataTypes.STRING,
                allowNull: false,
                comment: "Phân loại.",
            },
            DetailValue: {
                type: DataTypes.STRING,
                allowNull: false,
                comment: "Giá trị của phân loại.",
            },
            CategoryId: {
                type: DataTypes.UUID,
                allowNull: true,
                comment: "ID của thể loại hàng nó phụ thuộc.",
            },
        },
        {
            sequelize,
            modelName: "DetailCategory",
            tableName: "DetailCategories", // Tên bảng
            timestamps: true, // Tự động thêm createdAt và updatedAt
        }
    );

    return DetailCategory;
};
