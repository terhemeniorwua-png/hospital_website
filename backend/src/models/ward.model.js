const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/** Inpatient ward. */
const Ward = sequelize.define(
  'Ward',
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
    },
    code: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
    },
    departmentId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'Department', key: 'id' },
      onDelete: 'SET NULL',
    },
    floor: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    wardType: {
      type: DataTypes.ENUM('GENERAL', 'PRIVATE', 'ICU', 'HDU', 'MATERNITY', 'PAEDIATRIC', 'SURGICAL', 'ISOLATION'),
      allowNull: false,
      defaultValue: 'GENERAL',
    },
    totalBeds: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    description: {
      type: DataTypes.TEXT,
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
    tableName: 'wards',
    freezeTableName: true,
    timestamps: true,
    indexes: [
      { unique: true, fields: ['name'] },
      { unique: true, fields: ['code'] },
    ],
  },
);

module.exports = Ward;