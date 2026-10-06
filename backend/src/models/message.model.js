const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/** A single chat message inside a conversation. */
const Message = sequelize.define(
  'Message',
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    conversationId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'Conversation', key: 'id' },
      onDelete: 'CASCADE',
    },
    senderId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'User', key: 'id' },
      onDelete: 'SET NULL',
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    attachmentUrl: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    attachmentName: {
      type: DataTypes.STRING(180),
      allowNull: true,
    },
    documentId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'Document', key: 'id' },
      onDelete: 'SET NULL',
    },
    isSystem: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    patientId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'Patient', key: 'id' },
      onDelete: 'SET NULL',
      comment: 'Set when a patient is discussed in the thread',
    },
    readBy: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'Array of user ids who have read the message',
    },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: 'messages',
    freezeTableName: true,
    timestamps: true,
    indexes: [
      { fields: ['conversationId', 'createdAt'] },
      { fields: ['senderId'] },
    ],
  },
);

module.exports = Message;