"use strict";

/** @type {import('sequelize-cli').Migration} */
"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("Products", "quantity", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0, // Mặc định số lượng là 0
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("Products", "quantity");
  },
};
