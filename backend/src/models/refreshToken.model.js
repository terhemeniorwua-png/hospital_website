const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Persisted refresh tokens. Only a SHA-256 hash of the token is stored so a
 * database leak cannot be replayed against the refresh endpoint.
 */
const RefreshToken = sequelize.define(
  'RefreshToken',
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
    jti: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    revokedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    revokedReason: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    replacedByTokenId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'RefreshToken', key: 'id' },
      onDelete: 'SET NULL',
    },
    userAgent: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    ipAddress: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: 'refresh_tokens',
    freezeTableName: true,
    timestamps: true,
    indexes: [
      { unique: true, fields: ['tokenHash'] },
      { fields: ['userId'] },
      { fields: ['expiresAt'] },
    ],
  },
);

RefreshToken.prototype.isActive = function isActive() {
  return !this.revokedAt && new Date(this.expiresAt) > new Date();
};

module.exports = RefreshToken;