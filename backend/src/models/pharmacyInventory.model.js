const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * A physical batch of medication held by the pharmacy.
 * Stock is per batch so expiry dates and batch numbers can be tracked
 * (FEFO - first expiry, first out - dispensing order).
 */
const PharmacyInventory = sequelize.define(
  'PharmacyInventory',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    medicationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Medication', key: 'id' },
      onDelete: 'RESTRICT',
    },
    supplierId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'Supplier', key: 'id' },
      onDelete: 'SET NULL',
    },
    batchNumber: {
      type: DataTypes.STRING(60),
      allowNull: false,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0 },
    },
    expiryDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    unitPrice: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    reorderLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10,
    },
    shelfLocation: {
      type: DataTypes.STRING(60),
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    lastRestockedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'User', key: 'id' },
      onDelete: 'SET NULL',
    },
    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'User', key: 'id' },
      onDelete: 'SET NULL',
    },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: 'pharmacy_inventory',
    freezeTableName: true,
    timestamps: true,
    indexes: [
      { unique: true, fields: ['medicationId', 'batchNumber'] },
      { fields: ['expiryDate'] },
      { fields: ['quantity'] },
    ],
  },
);

module.exports = PharmacyInventory;