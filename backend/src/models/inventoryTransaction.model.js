const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { INVENTORY_TRANSACTION_TYPES } = require('../config/constants');

/**
 * Append-only stock movement ledger. `quantity` is signed (positive for
 * stock in, negative for stock out) and `balanceAfter` snapshots the level so
 * discrepancies can be traced.
 */
const InventoryTransaction = sequelize.define(
  'InventoryTransaction',
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    pharmacyInventoryId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'PharmacyInventory', key: 'id' },
      onDelete: 'CASCADE',
    },
    medicationId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'Medication', key: 'id' },
      onDelete: 'CASCADE',
    },
    transactionType: {
      type: DataTypes.ENUM(...Object.values(INVENTORY_TRANSACTION_TYPES)),
      allowNull: false,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Signed: +in / -out',
    },
    balanceAfter: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    unitPrice: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    totalPrice: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    batchNumber: {
      type: DataTypes.STRING(60),
      allowNull: true,
    },
    referenceType: {
      type: DataTypes.STRING(40),
      allowNull: true,
      comment: 'PRESCRIPTION, PURCHASE, ADJUSTMENT',
    },
    referenceId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    supplierId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'Supplier', key: 'id' },
      onDelete: 'SET NULL',
    },
    performedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'User', key: 'id' },
      onDelete: 'SET NULL',
    },
    notes: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    performedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: 'inventory_transactions',
    freezeTableName: true,
    timestamps: true,
    indexes: [
      { fields: ['pharmacyInventoryId'] },
      { fields: ['medicationId'] },
      { fields: ['transactionType'] },
      { fields: ['referenceType', 'referenceId'] },
    ],
  },
);

InventoryTransaction.TYPES = INVENTORY_TRANSACTION_TYPES;

module.exports = InventoryTransaction;