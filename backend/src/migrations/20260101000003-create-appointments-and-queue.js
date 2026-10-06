'use strict';

/**
 * Appointment slots, appointments and the waiting-room queue
 *
 * Tables are created first and their foreign keys are attached
 * afterwards, so the creation order never depends on cross references
 * (for example users <-> patients). Constraints that reference a table
 * from a later migration are added by the final migration instead.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable('appointment_slots', {
        id: {
          type: Sequelize.UUID,
          allowNull: true,
          primaryKey: true,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
        },
        doctor_id: {
          type: Sequelize.UUID,
          allowNull: false,
        },
        department_id: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        slot_date: {
          type: Sequelize.DATEONLY,
          allowNull: false,
        },
        start_time: {
          type: Sequelize.STRING(5),
          allowNull: false,
          comment: "HH:mm 24h",
        },
        end_time: {
          type: Sequelize.STRING(5),
          allowNull: false,
          comment: "HH:mm 24h",
        },
        status: {
          type: Sequelize.ENUM("OPEN", "BOOKED", "BLOCKED", "CANCELLED"),
          allowNull: false,
          defaultValue: "OPEN",
        },
        is_blocked: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        notes: {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        created_by: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        updated_by: {
          type: Sequelize.UUID,
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
      }, { transaction });
      await queryInterface.createTable('appointments', {
        id: {
          type: Sequelize.UUID,
          allowNull: true,
          primaryKey: true,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
        },
        appointment_number: {
          type: Sequelize.STRING(30),
          allowNull: false,
        },
        patient_id: {
          type: Sequelize.UUID,
          allowNull: false,
        },
        doctor_id: {
          type: Sequelize.UUID,
          allowNull: false,
        },
        department_id: {
          type: Sequelize.UUID,
          allowNull: false,
        },
        slot_id: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        appointment_date: {
          type: Sequelize.DATEONLY,
          allowNull: false,
        },
        start_time: {
          type: Sequelize.STRING(5),
          allowNull: false,
        },
        end_time: {
          type: Sequelize.STRING(5),
          allowNull: true,
        },
        status: {
          type: Sequelize.ENUM("REQUESTED", "CONFIRMED", "CHECKED_IN", "IN_QUEUE", "IN_CONSULTATION", "COMPLETED", "CANCELLED", "NO_SHOW"),
          allowNull: false,
          defaultValue: "REQUESTED",
        },
        type: {
          type: Sequelize.ENUM("NEW", "FOLLOW_UP", "EMERGENCY", "ROUTINE", "SPECIALIST"),
          allowNull: false,
          defaultValue: "NEW",
        },
        reason: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        fee: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        checked_in_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        started_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        completed_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        cancelled_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        cancel_reason: {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        rescheduled_from_id: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        created_by: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        updated_by: {
          type: Sequelize.UUID,
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
      }, { transaction });
      await queryInterface.createTable('queue_entries', {
        id: {
          type: Sequelize.UUID,
          allowNull: true,
          primaryKey: true,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
        },
        ticket_number: {
          type: Sequelize.STRING(20),
          allowNull: false,
        },
        queue_date: {
          type: Sequelize.DATEONLY,
          allowNull: false,
        },
        department_id: {
          type: Sequelize.UUID,
          allowNull: false,
        },
        doctor_id: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        appointment_id: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        patient_id: {
          type: Sequelize.UUID,
          allowNull: false,
        },
        is_walk_in: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        priority: {
          type: Sequelize.ENUM("ROUTINE", "URGENT", "EMERGENCY"),
          allowNull: false,
          defaultValue: "ROUTINE",
        },
        status: {
          type: Sequelize.ENUM("WAITING", "CALLED", "IN_SERVICE", "COMPLETED", "SKIPPED"),
          allowNull: false,
          defaultValue: "WAITING",
        },
        position: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        estimated_wait_minutes: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        joined_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
        called_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        served_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        completed_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        skipped_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        skip_reason: {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        called_by: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        created_by: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        updated_by: {
          type: Sequelize.UUID,
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
      }, { transaction });
      await queryInterface.addConstraint('appointment_slots', {
        fields: ['doctor_id'],
        type: 'foreign key',
        name: "appointment_slots_doctor_id_fk",
        references: { table: 'doctors', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('appointment_slots', {
        fields: ['department_id'],
        type: 'foreign key',
        name: "appointment_slots_department_id_fk",
        references: { table: 'departments', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('appointment_slots', {
        fields: ['created_by'],
        type: 'foreign key',
        name: "appointment_slots_created_by_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('appointment_slots', {
        fields: ['updated_by'],
        type: 'foreign key',
        name: "appointment_slots_updated_by_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('appointments', {
        fields: ['patient_id'],
        type: 'foreign key',
        name: "appointments_patient_id_fk",
        references: { table: 'patients', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('appointments', {
        fields: ['doctor_id'],
        type: 'foreign key',
        name: "appointments_doctor_id_fk",
        references: { table: 'doctors', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('appointments', {
        fields: ['department_id'],
        type: 'foreign key',
        name: "appointments_department_id_fk",
        references: { table: 'departments', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('appointments', {
        fields: ['slot_id'],
        type: 'foreign key',
        name: "appointments_slot_id_fk",
        references: { table: 'appointment_slots', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('appointments', {
        fields: ['rescheduled_from_id'],
        type: 'foreign key',
        name: "appointments_rescheduled_from_id_fk",
        references: { table: 'appointments', field: 'id' },
        onDelete: "NO ACTION",
        transaction,
      });
      await queryInterface.addConstraint('appointments', {
        fields: ['created_by'],
        type: 'foreign key',
        name: "appointments_created_by_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('appointments', {
        fields: ['updated_by'],
        type: 'foreign key',
        name: "appointments_updated_by_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('queue_entries', {
        fields: ['department_id'],
        type: 'foreign key',
        name: "queue_entries_department_id_fk",
        references: { table: 'departments', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('queue_entries', {
        fields: ['doctor_id'],
        type: 'foreign key',
        name: "queue_entries_doctor_id_fk",
        references: { table: 'doctors', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('queue_entries', {
        fields: ['appointment_id'],
        type: 'foreign key',
        name: "queue_entries_appointment_id_fk",
        references: { table: 'appointments', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('queue_entries', {
        fields: ['patient_id'],
        type: 'foreign key',
        name: "queue_entries_patient_id_fk",
        references: { table: 'patients', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('queue_entries', {
        fields: ['called_by'],
        type: 'foreign key',
        name: "queue_entries_called_by_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('queue_entries', {
        fields: ['created_by'],
        type: 'foreign key',
        name: "queue_entries_created_by_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('queue_entries', {
        fields: ['updated_by'],
        type: 'foreign key',
        name: "queue_entries_updated_by_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addIndex('appointment_slots', {
        name: "appointment_slots_doctor_id_slot_date_start_time",
        fields: ["doctor_id", "slot_date", "start_time"],
        unique: true,
        transaction,
      });
      await queryInterface.addIndex('appointment_slots', {
        name: "appointment_slots_doctor_id_slot_date",
        fields: ["doctor_id", "slot_date"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('appointment_slots', {
        name: "appointment_slots_status",
        fields: ["status"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('appointments', {
        name: "appointments_appointment_number",
        fields: ["appointment_number"],
        unique: true,
        transaction,
      });
      await queryInterface.addIndex('appointments', {
        name: "appointments_patient_id_appointment_date",
        fields: ["patient_id", "appointment_date"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('appointments', {
        name: "appointments_doctor_id_appointment_date",
        fields: ["doctor_id", "appointment_date"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('appointments', {
        name: "appointments_status",
        fields: ["status"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('queue_entries', {
        name: "queue_entries_unique_ticket",
        fields: ["department_id", "queue_date", "ticket_number"],
        unique: true,
        transaction,
      });
      await queryInterface.addIndex('queue_entries', {
        name: "queue_entries_department_id_queue_date_status",
        fields: ["department_id", "queue_date", "status"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('queue_entries', {
        name: "queue_entries_patient_id",
        fields: ["patient_id"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('queue_entries', {
        name: "queue_entries_appointment_id",
        fields: ["appointment_id"],
        unique: true,
        transaction,
      });
      await queryInterface.sequelize.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS "appointments_unique_live_slot"
       ON "appointments" ("doctor_id", "appointment_date", "start_time")
     WHERE status NOT IN ('CANCELLED', 'NO_SHOW')`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS "appointments_unique_live_patient_slot"
       ON "appointments" ("patient_id", "doctor_id", "appointment_date", "start_time")
     WHERE status NOT IN ('CANCELLED', 'NO_SHOW')`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS "queue_entries_unique_open_ticket"
       ON "queue_entries" ("department_id", "queue_date", "ticket_number")
     WHERE status NOT IN ('COMPLETED', 'SKIPPED')`,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    const tables = ["queue_entries", "appointments", "appointment_slots"];
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
