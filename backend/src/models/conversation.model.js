const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/** Thread of messages between authorised participants. */
const Conversation = sequelize.define(
  'Conversation',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    subject: {
      type: DataTypes.STRING(180),
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('DIRECT', 'GROUP', 'CASE'),
      allowNull: false,
      defaultValue: 'DIRECT',
    },
    patientId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'Patient', key: 'id' },
      onDelete: 'SET NULL',
      comment: 'Optional clinical context',
    },
    lastMessageAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastMessagePreview: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    isArchived: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
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
    tableName: 'conversations',
    freezeTableName: true,
    timestamps: true,
    indexes: [{ fields: ['lastMessageAt'] }, { fields: ['patientId'] }],
  },
);

module.exports = Conversation;