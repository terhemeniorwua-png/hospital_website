const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { BILLING_ITEM_TYPES } = require('../config/constants');

/** A charge on an invoice. `unitPrice` comes from the source catalogue. */
const InvoiceItem = sequelize.define(
  'InvoiceItem',
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    invoiceId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'Invoice', key: 'id' },
      onDelete: 'CASCADE',
    },
    itemType: {
      type: DataTypes.ENUM(...Object.values(BILLING_ITEM_TYPES)),
      allowNull: false,
      defaultValue: BILLING_ITEM_TYPES.OTHER,
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    /** Polymorphic link back to the chargeable record (consultation, lab order...). */
    referenceType: {
      type: DataTypes.STRING(40),
      allowNull: true,
    },
    referenceId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    unitPrice: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    discountAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    taxRate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
    },
    taxAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    subtotal: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    total: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    isBilled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: 'invoice_items',
    freezeTableName: true,
    timestamps: true,
    indexes: [
      { fields: ['invoiceId'] },
      { fields: ['referenceType', 'referenceId'] },
      { fields: ['itemType'] },
    ],
  },
);

InvoiceItem.TYPES = BILLING_ITEM_TYPES;

module.exports = InvoiceItem;