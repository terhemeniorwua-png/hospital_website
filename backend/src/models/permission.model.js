const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/** A single capability, e.g. `patients:create`. */
const Permission = sequelize.define(
  'Permission',
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    name: {
      type: DataTypes.STRING(80),
      allowNull: false,
      unique: true,
      validate: { notEmpty: true },
    },
    resource: {
      type: DataTypes.STRING(40),
      allowNull: false,
    },
    action: {
      type: DataTypes.STRING(40),
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: 'permissions',
    freezeTableName: true,
    timestamps: true,
    indexes: [{ unique: true, fields: ['name'] }],
  },
);

module.exports = Permission;