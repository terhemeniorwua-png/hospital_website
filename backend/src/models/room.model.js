const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/** Room within a ward, holding one or more beds. */
const Room = sequelize.define(
  'Room',
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    wardId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'Ward', key: 'id' },
      onDelete: 'CASCADE',
    },
    roomNumber: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    roomType: {
      type: DataTypes.ENUM('GENERAL', 'PRIVATE', 'ICU', 'HDU', 'ISOLATION', 'THEATRE'),
      allowNull: false,
      defaultValue: 'GENERAL',
    },
    capacity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    dailyRate: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    notes: {
      type: DataTypes.STRING(255),
      allowNull: true,
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
    tableName: 'rooms',
    freezeTableName: true,
    timestamps: true,
    indexes: [
      { unique: true, fields: ['wardId', 'roomNumber'] },
      { fields: ['wardId'] },
    ],
  },
);

module.exports = Room;