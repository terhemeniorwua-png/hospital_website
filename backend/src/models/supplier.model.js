const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/** Pharmacy / laboratory supplier. */
const Supplier = sequelize.define(
  'Supplier',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
    },
    contactPerson: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    address: {
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
    tableName: 'suppliers',
    freezeTableName: true,
    timestamps: true,
    indexes: [{ unique: true, fields: ['name'] }],
  },
);

module.exports = Supplier;