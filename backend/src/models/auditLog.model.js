const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Immutable audit trail. Rows are append-only: the service layer never updates
 * or deletes them, and every sensitive read/write records who did what, when,
 * from where and against which patient.
 */
const AuditLog = sequelize.define(
  'AuditLog',
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'User', key: 'id' },
      onDelete: 'SET NULL',
    },
    userEmail: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    userRole: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    action: {
      type: DataTypes.STRING(60),
      allowNull: false,
    },
    resource: {
      type: DataTypes.STRING(60),
      allowNull: false,
    },
    resourceId: {
      type: DataTypes.STRING(60),
      allowNull: true,
    },
    patientId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    method: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    path: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    ipAddress: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    userAgent: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    statusCode: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    durationMs: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: 'audit_logs',
    freezeTableName: true,
    timestamps: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['patientId'] },
      { fields: ['action'] },
      { fields: ['resource', 'resourceId'] },
      { fields: ['createdAt'] },
    ],
  },
);

module.exports = AuditLog;