const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/** Membership + per-user unread tracking for a conversation. */
const ConversationParticipant = sequelize.define(
  'ConversationParticipant',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    conversationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Conversation', key: 'id' },
      onDelete: 'CASCADE',
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'User', key: 'id' },
      onDelete: 'CASCADE',
    },
    roleInConversation: {
      type: DataTypes.ENUM('MEMBER', 'OWNER', 'OBSERVER'),
      allowNull: false,
      defaultValue: 'MEMBER',
    },
    unreadCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    lastReadAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    isMuted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    joinedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: 'conversation_participants',
    freezeTableName: true,
    timestamps: true,
    indexes: [
      { unique: true, fields: ['conversationId', 'userId'] },
      { fields: ['userId'] },
    ],
  },
);

module.exports = ConversationParticipant;