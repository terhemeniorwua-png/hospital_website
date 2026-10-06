const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Doctor profile. Clinical credentials live here while authentication
 * concerns (password, role, status) live on `users`.
 */
const Doctor = sequelize.define(
  'Doctor',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: { model: 'User', key: 'id' },
      onDelete: 'CASCADE',
    },
    departmentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'Department', key: 'id' },
      onDelete: 'SET NULL',
    },
    specialization: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    subSpecialization: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    licenseNumber: {
      type: DataTypes.STRING(60),
      allowNull: false,
      unique: true,
    },
    qualification: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    yearsOfExperience: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    consultationFee: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    /**
     * Weekly availability, e.g.
     * { "MONDAY": [{ "start": "09:00", "end": "13:00" }], "SATURDAY": [...] }
     */
    availability: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
    },
    slotDurationMinutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30,
    },
    isAcceptingAppointments: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    isOnDuty: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
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
    tableName: 'doctors',
    freezeTableName: true,
    timestamps: true,
    indexes: [
      { unique: true, fields: ['userId'] },
      { unique: true, fields: ['licenseNumber'] },
      { fields: ['departmentId'] },
      { fields: ['specialization'] },
    ],
  },
);

module.exports = Doctor;