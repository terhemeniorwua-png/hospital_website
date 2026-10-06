const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { APPOINTMENT_STATUS } = require('../config/constants');

/** Patient <-> department <-> doctor <-> date <-> time booking. */
const Appointment = sequelize.define(
  'Appointment',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    appointmentNumber: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
    },
    patientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Patient', key: 'id' },
      onDelete: 'CASCADE',
    },
    doctorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Doctor', key: 'id' },
      onDelete: 'RESTRICT',
    },
    departmentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Department', key: 'id' },
      onDelete: 'RESTRICT',
    },
    slotId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'AppointmentSlot', key: 'id' },
      onDelete: 'SET NULL',
    },
    appointmentDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    startTime: {
      type: DataTypes.STRING(5),
      allowNull: false,
    },
    endTime: {
      type: DataTypes.STRING(5),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(APPOINTMENT_STATUS)),
      allowNull: false,
      defaultValue: APPOINTMENT_STATUS.REQUESTED,
    },
    type: {
      type: DataTypes.ENUM('NEW', 'FOLLOW_UP', 'EMERGENCY', 'ROUTINE', 'SPECIALIST'),
      allowNull: false,
      defaultValue: 'NEW',
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    fee: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    checkedInAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    cancelledAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    cancelReason: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    rescheduledFromId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'Appointment', key: 'id' },
      onDelete: 'SET NULL',
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
    tableName: 'appointments',
    freezeTableName: true,
    timestamps: true,
    indexes: [
      { unique: true, fields: ['appointmentNumber'] },
      { fields: ['patientId', 'appointmentDate'] },
      { fields: ['doctorId', 'appointmentDate'] },
      { fields: ['status'] },
      // NOTE: double-booking is blocked in the database by the partial unique
      // index created in migration `20260102000060-...-prevent-double-booking`
      // (`UNIQUE (doctor_id, appointment_date, start_time)` for live statuses).
    ],
  },
);

Appointment.STATUSES = APPOINTMENT_STATUS;

module.exports = Appointment;