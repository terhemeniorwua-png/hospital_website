const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/** Hospital department / clinical unit (Emergency, Cardiology, ...). */
const Department = sequelize.define(
  'Department',
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
      unique: true,
      validate: { notEmpty: true },
    },
    code: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
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
    location: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    isEmergency: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
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
    tableName: 'departments',
    freezeTableName: true,
    timestamps: true,
    indexes: [
      { unique: true, fields: ['name'] },
      { unique: true, fields: ['code'] },
    ],
  },
);

module.exports = Department;