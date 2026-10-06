const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/** Single-use password reset tokens (hashed at rest). */
const PasswordReset = sequelize.define(
  'PasswordReset',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'User', key: 'id' },
      onDelete: 'CASCADE',
    },
    tokenHash: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    usedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    requestedIp: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: 'password_resets',
    freezeTableName: true,
    timestamps: true,
    indexes: [
      { unique: true, fields: ['tokenHash'] },
      { fields: ['userId'] },
    ],
  },
);

PasswordReset.prototype.isUsable = function isUsable() {
  return !this.usedAt && new Date(this.expiresAt) > new Date();
};

module.exports = PasswordReset;