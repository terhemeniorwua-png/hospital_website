const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { NOTIFICATION_TYPES } = require('../config/constants');

/**
 * In-app notification. `patientId` is optional: clinical notifications are
 * addressed to the patient record while staff notifications target a `userId`.
 */
const Notification = sequelize.define(
  'Notification',
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'User', key: 'id' },
      onDelete: 'CASCADE',
    },
    patientId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'Patient', key: 'id' },
      onDelete: 'CASCADE',
    },
    type: {
      type: DataTypes.ENUM(...Object.values(NOTIFICATION_TYPES)),
      allowNull: false,
      defaultValue: NOTIFICATION_TYPES.SYSTEM,
    },
    title: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    data: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    priority: {
      type: DataTypes.ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT'),
      allowNull: false,
      defaultValue: 'NORMAL',
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    actionUrl: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'User', key: 'id' },
      onDelete: 'SET NULL',
    },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: 'notifications',
    freezeTableName: true,
    timestamps: true,
    indexes: [
      { fields: ['userId', 'isRead'] },
      { fields: ['patientId'] },
      { fields: ['createdAt'] },
    ],
  },
);

Notification.TYPES = NOTIFICATION_TYPES;

module.exports = Notification;