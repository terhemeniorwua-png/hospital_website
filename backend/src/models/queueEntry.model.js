const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { QUEUE_STATUS } = require('../config/constants');

/**
 * Real-time waiting room queue.
 * `ticketNumber` is the human facing label (e.g. "A-001") and is unique per
 * queue (department + day), which is enforced with a partial unique index.
 */
const QueueEntry = sequelize.define(
  'QueueEntry',
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    /** "A-001" style ticket, unique within (departmentId, queueDate). */
    ticketNumber: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    queueDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    departmentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'Department', key: 'id' },
      onDelete: 'CASCADE',
    },
    doctorId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'Doctor', key: 'id' },
      onDelete: 'SET NULL',
    },
    appointmentId: {
      type: DataTypes.UUID,
      allowNull: true,
      unique: true,
      references: { model: 'Appointment', key: 'id' },
      onDelete: 'SET NULL',
    },
    patientId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'Patient', key: 'id' },
      onDelete: 'CASCADE',
    },
    isWalkIn: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    priority: {
      type: DataTypes.ENUM('ROUTINE', 'URGENT', 'EMERGENCY'),
      allowNull: false,
      defaultValue: 'ROUTINE',
    },
    status: {
      type: DataTypes.ENUM(...Object.values(QUEUE_STATUS)),
      allowNull: false,
      defaultValue: QUEUE_STATUS.WAITING,
    },
    /** Live position, recomputed whenever the queue changes. */
    position: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    estimatedWaitMinutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    joinedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    calledAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    servedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    skippedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    skipReason: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    calledBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'User', key: 'id' },
      onDelete: 'SET NULL',
    },
    notes: {
      type: DataTypes.TEXT,
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
    tableName: 'queue_entries',
    freezeTableName: true,
    timestamps: true,
    indexes: [
      {
        name: 'queue_entries_unique_ticket',
        unique: true,
        fields: ['departmentId', 'queueDate', 'ticketNumber'],
      },
      { fields: ['departmentId', 'queueDate', 'status'] },
      { fields: ['patientId'] },
      { unique: true, fields: ['appointmentId'] },
    ],
  },
);

QueueEntry.STATUSES = QUEUE_STATUS;

module.exports = QueueEntry;