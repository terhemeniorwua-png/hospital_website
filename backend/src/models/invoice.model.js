const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { INVOICE_STATUS } = require('../config/constants');

/**
 * Patient invoice. Every monetary field is computed server side by
 * `billingService` - the API never accepts client supplied totals.
 */
const Invoice = sequelize.define(
  'Invoice',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    invoiceNumber: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
    },
    patientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Patient', key: 'id' },
      onDelete: 'CASCADE',
    },
    admissionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'Admission', key: 'id' },
      onDelete: 'SET NULL',
    },
    appointmentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'Appointment', key: 'id' },
      onDelete: 'SET NULL',
    },
    status: {
      type: DataTypes.ENUM(...Object.values(INVOICE_STATUS)),
      allowNull: false,
      defaultValue: INVOICE_STATUS.DRAFT,
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'NGN',
    },
    subtotal: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    taxAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    discountAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    insuranceAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    totalAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    amountPaid: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    balance: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    issuedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    dueDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    cancelledAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    cancelReason: {
      type: DataTypes.STRING(255),
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
    tableName: 'invoices',
    freezeTableName: true,
    timestamps: true,
    indexes: [
      { unique: true, fields: ['invoiceNumber'] },
      { fields: ['patientId', 'status'] },
      { fields: ['status', 'createdAt'] },
    ],
  },
);

Invoice.STATUSES = INVOICE_STATUS;

module.exports = Invoice;