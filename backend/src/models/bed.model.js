const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { BED_STATUS } = require('../config/constants');

/** A single bed. `status` is the source of truth for occupancy. */
const Bed = sequelize.define(
  'Bed',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    roomId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Room', key: 'id' },
      onDelete: 'CASCADE',
    },
    wardId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Ward', key: 'id' },
      onDelete: 'CASCADE',
    },
    bedNumber: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(BED_STATUS)),
      allowNull: false,
      defaultValue: BED_STATUS.AVAILABLE,
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
    tableName: 'beds',
    freezeTableName: true,
    timestamps: true,
    indexes: [
      { unique: true, fields: ['roomId', 'bedNumber'] },
      { fields: ['wardId', 'status'] },
    ],
  },
);

Bed.STATUSES = BED_STATUS;

module.exports = Bed;