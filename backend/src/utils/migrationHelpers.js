/**
 * Helpers shared by the generated migrations.
 */

/**
 * Postgres keeps user-defined ENUM types alive after their table is dropped,
 * which breaks a re-run of the migration. This removes any enum type belonging
 * to the given tables (Postgres names them `enum_<table>_<column>`).
 *
 * @param {import('sequelize').QueryInterface} queryInterface
 * @param {string[]} tables table names that were just dropped
 * @param {import('sequelize').Transaction} transaction
 */
async function dropEnumTypesFor(queryInterface, tables, transaction) {
  const sequelize = queryInterface.sequelize;
  const names = await sequelize.query(
    `SELECT t.typname AS name
       FROM pg_type t
       JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE t.typtype = 'e'
        AND n.nspname = current_schema()`,
    { transaction, type: sequelize.QueryTypes.SELECT },
  );

  const prefixes = tables.map((table) => `enum_${table}_`);
  const stale = names
    .map((row) => row.name)
    .filter((name) => prefixes.some((prefix) => name.startsWith(prefix)));

  for (const name of stale) {
    await sequelize.query(`DROP TYPE IF EXISTS "${name}" CASCADE`, { transaction });
  }
}

module.exports = { dropEnumTypesFor };