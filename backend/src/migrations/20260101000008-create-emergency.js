'use strict';

/**
 * Emergency department and triage
 *
 * Tables are created first and their foreign keys are attached
 * afterwards, so the creation order never depends on cross references
 * (for example users <-> patients). Constraints that reference a table
 * from a later migration are added by the final migration instead.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable('emergency_cases', {
        id: {
          type: Sequelize.UUID,
          allowNull: true,
          primaryKey: true,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
        },
        case_number: {
          type: Sequelize.STRING(30),
          allowNull: false,
        },
        patient_id: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        is_walk_in: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        walk_in_name: {
          type: Sequelize.STRING(120),
          allowNull: true,
        },
        walk_in_age: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        walk_in_gender: {
          type: Sequelize.ENUM("MALE", "FEMALE", "OTHER"),
          allowNull: true,
        },
        walk_in_phone: {
          type: Sequelize.STRING(30),
          allowNull: true,
        },
        chief_complaint: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        presenting_vitals: {
          type: Sequelize.JSONB,
          allowNull: true,
        },
        triage_level: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        triage_category: {
          type: Sequelize.ENUM("CRITICAL", "URGENT", "MODERATE", "LOW"),
          allowNull: false,
        },
        status: {
          type: Sequelize.ENUM("ARRIVED", "TRIAGED", "WAITING", "IN_TREATMENT", "OBSERVATION", "ADMITTED", "DISCHARGED", "TRANSFERRED"),
          allowNull: false,
          defaultValue: "ARRIVED",
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        treatment_notes: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        department_id: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        assigned_doctor_id: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        consultation_id: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        admission_id: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        registered_by: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        arrival_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
        triaged_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        triaged_by: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        treatment_started_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        discharged_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        outcome: {
          type: Sequelize.ENUM("STABLE", "IMPROVED", "UNCHANGED", "DECLINED", "REFERRED_OUT", "ADMITTED"),
          allowNull: true,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
        emergency_case_id: {
          type: Sequelize.UUID,
          allowNull: true,
        },
      }, { transaction });
      await queryInterface.addConstraint('emergency_cases', {
        fields: ['patient_id'],
        type: 'foreign key',
        name: "emergency_cases_patient_id_fk",
        references: { table: 'patients', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('emergency_cases', {
        fields: ['department_id'],
        type: 'foreign key',
        name: "emergency_cases_department_id_fk",
        references: { table: 'departments', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('emergency_cases', {
        fields: ['assigned_doctor_id'],
        type: 'foreign key',
        name: "emergency_cases_assigned_doctor_id_fk",
        references: { table: 'doctors', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('emergency_cases', {
        fields: ['consultation_id'],
        type: 'foreign key',
        name: "emergency_cases_consultation_id_fk",
        references: { table: 'consultations', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('emergency_cases', {
        fields: ['admission_id'],
        type: 'foreign key',
        name: "emergency_cases_admission_id_fk",
        references: { table: 'admissions', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('emergency_cases', {
        fields: ['registered_by'],
        type: 'foreign key',
        name: "emergency_cases_registered_by_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('emergency_cases', {
        fields: ['triaged_by'],
        type: 'foreign key',
        name: "emergency_cases_triaged_by_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('emergency_cases', {
        fields: ['emergency_case_id'],
        type: 'foreign key',
        name: "emergency_cases_emergency_case_id_fk",
        references: { table: 'admissions', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addIndex('emergency_cases', {
        name: "emergency_cases_case_number",
        fields: ["case_number"],
        unique: true,
        transaction,
      });
      await queryInterface.addIndex('emergency_cases', {
        name: "emergency_cases_status_arrival_at",
        fields: ["status", "arrival_at"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('emergency_cases', {
        name: "emergency_cases_patient_id",
        fields: ["patient_id"],
        unique: false,
        transaction,
      });
    });
  },

  async down(queryInterface) {
    const tables = ["emergency_cases"];
    await queryInterface.sequelize.transaction(async (transaction) => {
      for (const table of tables) {
        await queryInterface.dropTable(table, { transaction });
      }
      // Postgres keeps enum types after a table is dropped; removing the
      // leftovers keeps `migrate` / `migrate:undo` repeatable.
      await dropEnumTypesFor(queryInterface, tables, transaction);
    });
  },
};

const { dropEnumTypesFor } = require('../utils/migrationHelpers');
