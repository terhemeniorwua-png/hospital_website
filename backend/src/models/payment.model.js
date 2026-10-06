const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { PAYMENT_STATUS } = require('../config/constants');

/** A payment against an invoice. Successful payments update the invoice. */
const Payment = sequelize.define(
  'Payment',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    paymentNumber: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
    },
    invoiceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Invoice', key: 'id' },
      onDelete: 'CASCADE',
    },
    patientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Patient', key: 'id' },
      onDelete: 'CASCADE',
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    method: {
      type: DataTypes.ENUM('CASH', 'CARD', 'BANK_TRANSFER', 'MOBILE_MONEY', 'INSURANCE', 'WAIVER'),
      allowNull: false,
      defaultValue: 'CASH',
    },
    status: {
      type: DataTypes.ENUM(...Object.values(PAYMENT_STATUS)),
      allowNull: false,
      defaultValue: PAYMENT_STATUS.PENDING,
    },
    reference: {
      type: DataTypes.STRING(120),
      allowNull: true,
      comment: 'Receipt / teller reference',
    },
    receivedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'User', key: 'id' },
      onDelete: 'SET NULL',
    },
    notes: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    paidAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    refundedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    refundReason: {
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
    tableName: 'payments',
    freezeTableName: true,
    timestamps: true,
    indexes: [
      { unique: true, fields: ['paymentNumber'] },
      { fields: ['invoiceId'] },
      { fields: ['patientId', 'status'] },
    ],
  },
);

Payment.STATUSES = PAYMENT_STATUS;

module.exports = Payment;