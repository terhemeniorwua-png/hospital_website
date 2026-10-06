const { DataTypes } = require('sequelize');

/** Human-readable output for money/number columns. */
module.exports = {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  /** DECIMAL(12,2) used for every monetary amount. */
  money: (allowNull = false, defaultValue = null) => ({
    type: DataTypes.DECIMAL(12, 2),
    allowNull,
    defaultValue,
  }),
  qty: (allowNull = false) => ({
    type: DataTypes.INTEGER,
    allowNull,
  }),
  note: (allowNull = true, length = 2000) => ({
    type: DataTypes.TEXT,
    allowNull,
  }),
  shortText: (allowNull = true, length = 500) => ({
    type: DataTypes.STRING(length),
    allowNull,
  }),
  json: (allowNull = true) => ({
    type: DataTypes.JSONB,
    allowNull,
  }),
  date: (allowNull = true) => ({
    type: DataTypes.DATEONLY,
    allowNull,
  }),
  timestamp: (allowNull = true) => ({
    type: DataTypes.DATE,
    allowNull,
  }),
};