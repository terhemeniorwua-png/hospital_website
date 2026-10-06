'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const WardNote = sequelize.define(
  'WardNote',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    // TODO: replace with the real columns.
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
      validate: { notEmpty: true },
    },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: 'ward_note',
    freezeTableName: true,
    timestamps: true,
    indexes: [],
  },
);

module.exports = WardNote;
