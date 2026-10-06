const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/** A patient's cover under a provider. */
const InsurancePolicy = sequelize.define(
  'InsurancePolicy',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    patientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Patient', key: 'id' },
      onDelete: 'CASCADE',
    },
    providerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'InsuranceProvider', key: 'id' },
      onDelete: 'RESTRICT',
    },
    policyNumber: {
      type: DataTypes.STRING(60),
      allowNull: false,
      unique: true,
    },
    planName: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    coverageAmount: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0,
    },
    /** Percentage of an invoice an insurer will cover, e.g. 75. */
    coveragePercentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
    },
    premiumAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED'),
      allowNull: false,
      defaultValue: 'ACTIVE',
    },
    isPrimary: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: 'insurance_policies',
    freezeTableName: true,
    timestamps: true,
    indexes: [
      { unique: true, fields: ['policyNumber'] },
      { fields: ['patientId', 'status'] },
    ],
  },
);

module.exports = InsurancePolicy;