const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { SLOT_STATUS } = require('../config/constants');

/**
 * A bookable time slot for a doctor on a given date.
 *
 * `@@unique([doctorId, slotDate, startTime])` plus the booking transaction in
 * the appointment service is what prevents double booking at the database level.
 */
const AppointmentSlot = sequelize.define(
  'AppointmentSlot',
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    doctorId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'Doctor', key: 'id' },
      onDelete: 'CASCADE',
    },
    departmentId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'Department', key: 'id' },
      onDelete: 'SET NULL',
    },
    slotDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    startTime: {
      type: DataTypes.STRING(5),
      allowNull: false,
      comment: 'HH:mm 24h',
    },
    endTime: {
      type: DataTypes.STRING(5),
      allowNull: false,
      comment: 'HH:mm 24h',
    },
    status: {
      type: DataTypes.ENUM(...Object.values(SLOT_STATUS)),
      allowNull: false,
      defaultValue: SLOT_STATUS.OPEN,
    },
    isBlocked: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    notes: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'User', key: 'id' },
      onDelete: 'SET NULL',
    },
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'User', key: 'id' },
      onDelete: 'SET NULL',
    },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: 'appointment_slots',
    freezeTableName: true,
    timestamps: true,
    indexes: [
      { unique: true, fields: ['doctorId', 'slotDate', 'startTime'] },
      { fields: ['doctorId', 'slotDate'] },
      { fields: ['status'] },
    ],
  },
);

AppointmentSlot.STATUSES = SLOT_STATUS;

module.exports = AppointmentSlot;