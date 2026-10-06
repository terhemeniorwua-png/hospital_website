const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/** Nurse profile (ward assignments, nursing notes, medication administration). */
const Nurse = sequelize.define(
  'Nurse',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: { model: 'User', key: 'id' },
      onDelete: 'CASCADE',
    },
    departmentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'Department', key: 'id' },
      onDelete: 'SET NULL',
    },
    qualification: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    registrationNumber: {
      type: DataTypes.STRING(60),
      allowNull: true,
      unique: true,
    },
    specialization: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    shift: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    isOnDuty: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
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
    tableName: 'nurses',
    freezeTableName: true,
    timestamps: true,
    indexes: [
      { unique: true, fields: ['userId'] },
      { fields: ['departmentId'] },
    ],
  },
);

module.exports = Nurse;