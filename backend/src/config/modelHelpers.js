const { DataTypes } = require('sequelize');
const env = require('./env');
const { ROLES } = require('./constants');
const { ALL_PERMISSIONS } = require('./permissions');

/**
 * Shared model scaffolding helpers, keeping every model consistent.
 */

/** Attribute set for the auto-managed `created_at` / `updated_at` columns. */
const timestamps = {
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
};

/** Optional created-by / updated-by audit stamps. */
const actorStamps = (User) => ({
  createdBy: { type: DataTypes.UUID, references: { model: User, key: 'id' }, onDelete: 'SET NULL' },
  updatedBy: { type: DataTypes.UUID, references: { model: User, key: 'id' }, onDelete: 'SET NULL' },
});

/** Soft-ish "belongs to a user" reference used across clinical tables. */
const userRef = (User, { allowNull = true, as } = {}) => ({
  type: DataTypes.UUID,
  allowNull,
  ...(as ? { as } : {}),
  references: { model: User, key: 'id' },
  onDelete: allowNull ? 'SET NULL' : 'RESTRICT',
});

/**
 * Standard options for every model.
 * @param {object} config
 * @param {import('sequelize').ModelCtor} config.User referenced model for actor stamps
 */
function defineModel(sequelize, name, attributes, config = {}) {
  const model = sequelize.define(
    name,
    {
      ...attributes,
      ...timestamps,
      ...(config.withActors === false ? {} : actorStamps(config.User)),
    },
    {
      tableName: config.tableName || name.toLowerCase(),
      indexes: config.indexes || [],
      ...config.options,
    },
  );

  model.ROLE = ROLES;
  model.ALL_PERMISSIONS = ALL_PERMISSIONS;
  model.env = env;
  return model;
}

/** Removes undefined keys so `update({})` does not blow up. */
function clean(values) {
  return Object.fromEntries(Object.entries(values).filter(([, v]) => v !== undefined));
}

module.exports = { timestamps, actorStamps, userRef, defineModel, clean };