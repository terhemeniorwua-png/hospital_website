const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { STAFF_TYPES } = require('../config/constants');

/** Non-clinical staff: receptionists, accountants, pharmacists, lab techs. */
const Staff = sequelize.define(
  'Staff',
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
    staffType: {
      type: DataTypes.ENUM(...Object.values(STAFF_TYPES)),
      allowNull: false,
    },
    jobTitle: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    employeeNumber: {
      type: DataTypes.STRING(40),
      allowNull: true,
      unique: true,
    },
    dateEmployed: {
      type: DataTypes.DATEONLY,
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
    tableName: 'staff',
    freezeTableName: true,
    timestamps: true,
    indexes: [
      { unique: true, fields: ['userId'] },
      { fields: ['departmentId'] },
      { fields: ['staffType'] },
    ],
  },
);

module.exports = Staff;