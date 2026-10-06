const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { USER_STATUS, ROLES } = require('../config/constants');

/**
 * Application user account. Passwords are stored as bcrypt hashes only
 * (`passwordHash`); the plaintext is never persisted.
 */
const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    firstName: {
      type: DataTypes.STRING(80),
      allowNull: false,
      validate: { notEmpty: true },
    },
    lastName: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    phone: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    passwordHash: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    roleId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'Role', key: 'id' },
      onDelete: 'RESTRICT',
    },
    status: {
      type: DataTypes.ENUM(...Object.values(USER_STATUS)),
      allowNull: false,
      defaultValue: USER_STATUS.ACTIVE,
    },
    /** Link to the Patient row for PATIENT accounts. */
    patientId: {
      type: DataTypes.UUID,
      allowNull: true,
      unique: true,
      references: { model: 'Patient', key: 'id' },
      onDelete: 'SET NULL',
    },
    employeeId: {
      type: DataTypes.STRING(40),
      allowNull: true,
      unique: true,
    },
    gender: {
      type: DataTypes.ENUM('MALE', 'FEMALE', 'OTHER'),
      allowNull: true,
    },
    address: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    avatarUrl: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastLoginIp: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    failedLoginAttempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    lockedUntil: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    passwordChangedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    mustChangePassword: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    emailVerifiedAt: {
      type: DataTypes.DATE,
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
    tableName: 'users',
    freezeTableName: true,
    timestamps: true,
    defaultScope: {
      attributes: { exclude: ['passwordHash'] },
    },
    scopes: {
      withPassword: { attributes: { include: ['passwordHash'] } },
    },
    indexes: [
      { unique: true, fields: ['email'] },
      { unique: true, fields: ['employeeId'] },
      { fields: ['roleId'] },
      { fields: ['status'] },
    ],
  },
);

User.prototype.toJSON = function toJSON() {
  const values = { ...this.get() };
  delete values.passwordHash;
  return values;
};

/** Full name helper used across responses and audit metadata. */
User.prototype.getFullName = function getFullName() {
  return [this.firstName, this.lastName].filter(Boolean).join(' ');
};

User.STATUSES = USER_STATUS;
User.ROLES = ROLES;

module.exports = User;