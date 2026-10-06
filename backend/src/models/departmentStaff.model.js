const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Many-to-many assignment of a user to a department, optionally with a
 * department-specific title (e.g. "Consultant Cardiologist").
 */
const DepartmentStaff = sequelize.define(
  'DepartmentStaff',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    departmentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Department', key: 'id' },
      onDelete: 'CASCADE',
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'User', key: 'id' },
      onDelete: 'CASCADE',
    },
    roleInDepartment: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },
    isPrimary: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    assignedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'User', key: 'id' },
      onDelete: 'SET NULL',
    },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: 'department_staff',
    freezeTableName: true,
    timestamps: true,
    indexes: [
      { unique: true, fields: ['departmentId', 'userId'] },
      { fields: ['userId'] },
    ],
  },
);

module.exports = DepartmentStaff;