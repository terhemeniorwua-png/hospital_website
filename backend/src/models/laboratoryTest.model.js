const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/** Laboratory test catalogue with reference ranges and prices. */
const LaboratoryTest = sequelize.define(
  'LaboratoryTest',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    code: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING(60),
      allowNull: false,
      defaultValue: 'GENERAL',
    },
    specimen: {
      type: DataTypes.STRING(60),
      allowNull: true,
      comment: 'BLOOD, URINE, SPUTUM, ...',
    },
    method: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    unit: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    referenceRangeMin: {
      type: DataTypes.DECIMAL(12, 4),
      allowNull: true,
    },
    referenceRangeMax: {
      type: DataTypes.DECIMAL(12, 4),
      allowNull: true,
    },
    referenceRangeText: {
      type: DataTypes.STRING(150),
      allowNull: true,
      comment: 'Used for qualitative tests such as "Negative"',
    },
    criticalLow: {
      type: DataTypes.DECIMAL(12, 4),
      allowNull: true,
    },
    criticalHigh: {
      type: DataTypes.DECIMAL(12, 4),
      allowNull: true,
    },
    price: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    turnaroundHours: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    requiresFasting: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: 'laboratory_tests',
    freezeTableName: true,
    timestamps: true,
    indexes: [
      { unique: true, fields: ['code'] },
      { fields: ['name'] },
      { fields: ['category'] },
    ],
  },
);

module.exports = LaboratoryTest;