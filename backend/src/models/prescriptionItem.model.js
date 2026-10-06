const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/** A prescribed drug line. Price is copied from the medication catalogue. */
const PrescriptionItem = sequelize.define(
  'PrescriptionItem',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    prescriptionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Prescription', key: 'id' },
      onDelete: 'CASCADE',
    },
    medicationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Medication', key: 'id' },
      onDelete: 'RESTRICT',
    },
    dosage: {
      type: DataTypes.STRING(80),
      allowNull: false,
      comment: 'e.g. "500mg"',
    },
    frequency: {
      type: DataTypes.STRING(80),
      allowNull: false,
      comment: 'e.g. "Every 8 hours"',
    },
    duration: {
      type: DataTypes.STRING(80),
      allowNull: true,
      comment: 'e.g. "5 days"',
    },
    route: {
      type: DataTypes.STRING(40),
      allowNull: true,
      comment: 'ORAL, IV, IM, TOPICAL',
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    dispensedQuantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    instructions: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    unitPrice: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    totalPrice: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    isDispensed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: 'prescription_items',
    freezeTableName: true,
    timestamps: true,
    indexes: [{ fields: ['prescriptionId'] }, { fields: ['medicationId'] }],
  },
);

module.exports = PrescriptionItem;