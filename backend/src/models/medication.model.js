const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/** Drug / medication master record. */
const Medication = sequelize.define(
  'Medication',
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
    genericName: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    brandName: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    form: {
      type: DataTypes.STRING(40),
      allowNull: true,
      comment: 'TABLET, CAPSULE, SYRUP, INJECTION, ...',
    },
    strength: {
      type: DataTypes.STRING(40),
      allowNull: true,
    },
    manufacturer: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    unitPrice: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    requiresPrescription: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    /** Default reorder threshold copied onto new inventory batches. */
    reorderLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10,
    },
    unitOfMeasure: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'unit',
    },
    storageConditions: {
      type: DataTypes.STRING(120),
      allowNull: true,
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
    tableName: 'medications',
    freezeTableName: true,
    timestamps: true,
    indexes: [
      { unique: true, fields: ['code'] },
      { fields: ['name'] },
      { fields: ['genericName'] },
    ],
  },
);

module.exports = Medication;