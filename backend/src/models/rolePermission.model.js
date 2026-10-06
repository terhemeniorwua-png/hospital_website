const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/** Join table mapping roles to permissions. */
const RolePermission = sequelize.define(
  'RolePermission',
  {
    roleId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: { model: 'Role', key: 'id' },
      onDelete: 'CASCADE',
    },
    permissionId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: { model: 'Permission', key: 'id' },
      onDelete: 'CASCADE',
    },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: 'role_permissions',
    freezeTableName: true,
    timestamps: true,
    indexes: [{ unique: true, fields: ['roleId', 'permissionId'] }],
  },
);

module.exports = RolePermission;