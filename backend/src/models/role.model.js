const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Role catalogue (SUPER_ADMIN, DOCTOR, PATIENT, ...).
 * `name` is the code used everywhere in the API; `isSystem` roles are seeded
 * and must not be deleted.
 */
const Role = sequelize.define(
  'Role',
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: { notEmpty: true },
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    isSystem: {
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
    tableName: 'roles',
    freezeTableName: true,
    timestamps: true,
    indexes: [{ unique: true, fields: ['name'] }],
  },
);

Role.prototype.toJSON = function toJSON() {
  const values = { ...this.get() };
  delete values.passwordHash;
  return values;
};

module.exports = Role;