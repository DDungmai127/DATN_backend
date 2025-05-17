"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("OrderItems", "productName", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "Sản phẩm",
    });

    await queryInterface.addColumn("OrderItems", "amount", {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("OrderItems", "productName");
    await queryInterface.removeColumn("OrderItems", "amount");
  },
};
