const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/** Insurer / HMO. */
const InsuranceProvider = sequelize.define(
  'InsuranceProvider',
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
    },
    code: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
    },
    contactPerson: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    address: {
      type: DataTypes.STRING(255),
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
    tableName: 'insurance_providers',
    freezeTableName: true,
    timestamps: true,
    indexes: [
      { unique: true, fields: ['name'] },
      { unique: true, fields: ['code'] },
    ],
  },
);

module.exports = InsuranceProvider;