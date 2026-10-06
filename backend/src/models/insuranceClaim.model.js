const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/** A reimbursement claim made against an invoice. */
const InsuranceClaim = sequelize.define(
  'InsuranceClaim',
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    claimNumber: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
    },
    invoiceId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'Invoice', key: 'id' },
      onDelete: 'CASCADE',
    },
    policyId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'InsurancePolicy', key: 'id' },
      onDelete: 'RESTRICT',
    },
    patientId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'Patient', key: 'id' },
      onDelete: 'CASCADE',
    },
    claimAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    approvedAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    rejectedAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    patientContribution: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PAID', 'CANCELLED'),
      allowNull: false,
      defaultValue: 'DRAFT',
    },
    diagnosisSummary: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    supportingNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    rejectionReason: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    submittedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    reviewedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'User', key: 'id' },
      onDelete: 'SET NULL',
    },
    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    paidAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'User', key: 'id' },
      onDelete: 'SET NULL',
    },
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'User', key: 'id' },
      onDelete: 'SET NULL',
    },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: 'insurance_claims',
    freezeTableName: true,
    timestamps: true,
    indexes: [
      { unique: true, fields: ['claimNumber'] },
      { fields: ['invoiceId'] },
      { fields: ['status'] },
      { fields: ['patientId'] },
    ],
  },
);

module.exports = InsuranceClaim;