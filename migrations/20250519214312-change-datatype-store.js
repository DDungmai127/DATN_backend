"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn("Stores", "longitude", {
      type: Sequelize.DECIMAL(11, 8),
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn("Stores", "longitude", {
      type: Sequelize.DECIMAL(10, 8),
      allowNull: false,
    });
  },
};
