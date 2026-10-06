'use strict';

/**
 * Wards, rooms, beds, admissions and nursing records
 *
 * Tables are created first and their foreign keys are attached
 * afterwards, so the creation order never depends on cross references
 * (for example users <-> patients). Constraints that reference a table
 * from a later migration are added by the final migration instead.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable('wards', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          primaryKey: true,
          autoIncrement: true,
        },
        name: {
          type: Sequelize.STRING(120),
          allowNull: false,
        },
        code: {
          type: Sequelize.STRING(20),
          allowNull: false,
        },
        department_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        floor: {
          type: Sequelize.STRING(20),
          allowNull: true,
        },
        ward_type: {
          type: Sequelize.ENUM("GENERAL", "PRIVATE", "ICU", "HDU", "MATERNITY", "PAEDIATRIC", "SURGICAL", "ISOLATION"),
          allowNull: false,
          defaultValue: "GENERAL",
        },
        total_beds: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
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
      await queryInterface.createTable('rooms', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          primaryKey: true,
          autoIncrement: true,
        },
        ward_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        room_number: {
          type: Sequelize.STRING(20),
          allowNull: false,
        },
        room_type: {
          type: Sequelize.ENUM("GENERAL", "PRIVATE", "ICU", "HDU", "ISOLATION", "THEATRE"),
          allowNull: false,
          defaultValue: "GENERAL",
        },
        capacity: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1,
        },
        daily_rate: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        notes: {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
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
      await queryInterface.createTable('beds', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          primaryKey: true,
          autoIncrement: true,
        },
        room_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        ward_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        bed_number: {
          type: Sequelize.STRING(20),
          allowNull: false,
        },
        status: {
          type: Sequelize.ENUM("AVAILABLE", "OCCUPIED", "RESERVED", "CLEANING", "MAINTENANCE"),
          allowNull: false,
          defaultValue: "AVAILABLE",
        },
        daily_rate: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        notes: {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
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
      await queryInterface.createTable('admissions', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          primaryKey: true,
          autoIncrement: true,
        },
        admission_number: {
          type: Sequelize.STRING(30),
          allowNull: false,
        },
        patient_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        ward_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        room_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        bed_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        admitted_by: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        attending_doctor_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        consultation_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        emergency_case_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        status: {
          type: Sequelize.ENUM("ADMITTED", "TRANSFERRED", "DISCHARGED", "ABSCONDED"),
          allowNull: false,
          defaultValue: "ADMITTED",
        },
        admitted_from: {
          type: Sequelize.ENUM("OPD", "EMERGENCY", "TRANSFER", "REFERRAL", "ELECTIVE"),
          allowNull: false,
          defaultValue: "OPD",
        },
        reason_for_admission: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        diagnosis: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        condition_on_admission: {
          type: Sequelize.ENUM("STABLE", "CRITICAL", "SERIOUS", "EMERGENCY"),
          allowNull: false,
          defaultValue: "STABLE",
        },
        daily_rate: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        admitted_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
        expected_discharge_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        discharged_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        discharged_by: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        discharge_summary: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        discharge_type: {
          type: Sequelize.ENUM("NORMAL", "ABSCONDED", "TRANSFERRED_OUT", "LAMA", "REFERRED"),
          allowNull: true,
        },
        discharged_to: {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        days_admitted: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        notes: {
          type: Sequelize.TEXT,
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
      await queryInterface.createTable('nursing_notes', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          primaryKey: true,
          autoIncrement: true,
        },
        patient_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        admission_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        nurse_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        ward_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        note_type: {
          type: Sequelize.ENUM("ASSESSMENT", "PROGRESS", "NURSING_CARE", "TRANSFER", "INCIDENT", "DISCHARGE"),
          allowNull: false,
          defaultValue: "PROGRESS",
        },
        note: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        is_critical: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        shift: {
          type: Sequelize.STRING(30),
          allowNull: true,
        },
        recorded_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
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
      await queryInterface.createTable('medication_administrations', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          primaryKey: true,
          autoIncrement: true,
        },
        patient_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        admission_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        prescription_item_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        medication_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        medication_name: {
          type: Sequelize.STRING(180),
          allowNull: false,
        },
        dose: {
          type: Sequelize.STRING(60),
          allowNull: false,
        },
        route: {
          type: Sequelize.STRING(40),
          allowNull: true,
        },
        frequency: {
          type: Sequelize.STRING(80),
          allowNull: true,
        },
        scheduled_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        administered_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        status: {
          type: Sequelize.ENUM("SCHEDULED", "ADMINISTERED", "REFUSED", "HELD", "OMITTED"),
          allowNull: false,
          defaultValue: "SCHEDULED",
        },
        nurse_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        notes: {
          type: Sequelize.STRING(500),
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
      await queryInterface.addConstraint('wards', {
        fields: ['department_id'],
        type: 'foreign key',
        name: "wards_department_id_fk",
        references: { table: 'departments', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('rooms', {
        fields: ['ward_id'],
        type: 'foreign key',
        name: "rooms_ward_id_fk",
        references: { table: 'wards', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('beds', {
        fields: ['room_id'],
        type: 'foreign key',
        name: "beds_room_id_fk",
        references: { table: 'rooms', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('beds', {
        fields: ['ward_id'],
        type: 'foreign key',
        name: "beds_ward_id_fk",
        references: { table: 'wards', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('admissions', {
        fields: ['patient_id'],
        type: 'foreign key',
        name: "admissions_patient_id_fk",
        references: { table: 'patients', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('admissions', {
        fields: ['ward_id'],
        type: 'foreign key',
        name: "admissions_ward_id_fk",
        references: { table: 'wards', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('admissions', {
        fields: ['room_id'],
        type: 'foreign key',
        name: "admissions_room_id_fk",
        references: { table: 'rooms', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('admissions', {
        fields: ['bed_id'],
        type: 'foreign key',
        name: "admissions_bed_id_fk",
        references: { table: 'beds', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('admissions', {
        fields: ['admitted_by'],
        type: 'foreign key',
        name: "admissions_admitted_by_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('admissions', {
        fields: ['attending_doctor_id'],
        type: 'foreign key',
        name: "admissions_attending_doctor_id_fk",
        references: { table: 'doctors', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('admissions', {
        fields: ['consultation_id'],
        type: 'foreign key',
        name: "admissions_consultation_id_fk",
        references: { table: 'consultations', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('admissions', {
        fields: ['discharged_by'],
        type: 'foreign key',
        name: "admissions_discharged_by_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('nursing_notes', {
        fields: ['patient_id'],
        type: 'foreign key',
        name: "nursing_notes_patient_id_fk",
        references: { table: 'patients', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('nursing_notes', {
        fields: ['admission_id'],
        type: 'foreign key',
        name: "nursing_notes_admission_id_fk",
        references: { table: 'admissions', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('nursing_notes', {
        fields: ['nurse_id'],
        type: 'foreign key',
        name: "nursing_notes_nurse_id_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('nursing_notes', {
        fields: ['ward_id'],
        type: 'foreign key',
        name: "nursing_notes_ward_id_fk",
        references: { table: 'wards', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('medication_administrations', {
        fields: ['patient_id'],
        type: 'foreign key',
        name: "medication_administrations_patient_id_fk",
        references: { table: 'patients', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('medication_administrations', {
        fields: ['admission_id'],
        type: 'foreign key',
        name: "medication_administrations_admission_id_fk",
        references: { table: 'admissions', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('medication_administrations', {
        fields: ['prescription_item_id'],
        type: 'foreign key',
        name: "medication_administrations_prescription_item_id_fk",
        references: { table: 'prescription_items', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('medication_administrations', {
        fields: ['medication_id'],
        type: 'foreign key',
        name: "medication_administrations_medication_id_fk",
        references: { table: 'medications', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('medication_administrations', {
        fields: ['nurse_id'],
        type: 'foreign key',
        name: "medication_administrations_nurse_id_fk",
        references: { table: 'users', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addIndex('wards', {
        name: "wards_name",
        fields: ["name"],
        unique: true,
        transaction,
      });
      await queryInterface.addIndex('wards', {
        name: "wards_code",
        fields: ["code"],
        unique: true,
        transaction,
      });
      await queryInterface.addIndex('rooms', {
        name: "rooms_ward_id_room_number",
        fields: ["ward_id", "room_number"],
        unique: true,
        transaction,
      });
      await queryInterface.addIndex('rooms', {
        name: "rooms_ward_id",
        fields: ["ward_id"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('beds', {
        name: "beds_room_id_bed_number",
        fields: ["room_id", "bed_number"],
        unique: true,
        transaction,
      });
      await queryInterface.addIndex('beds', {
        name: "beds_ward_id_status",
        fields: ["ward_id", "status"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('admissions', {
        name: "admissions_admission_number",
        fields: ["admission_number"],
        unique: true,
        transaction,
      });
      await queryInterface.addIndex('admissions', {
        name: "admissions_patient_id_status",
        fields: ["patient_id", "status"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('admissions', {
        name: "admissions_ward_id_status",
        fields: ["ward_id", "status"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('nursing_notes', {
        name: "nursing_notes_patient_id_recorded_at",
        fields: ["patient_id", "recorded_at"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('nursing_notes', {
        name: "nursing_notes_admission_id",
        fields: ["admission_id"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('medication_administrations', {
        name: "medication_administrations_patient_id_administered_at",
        fields: ["patient_id", "administered_at"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('medication_administrations', {
        name: "medication_administrations_admission_id",
        fields: ["admission_id"],
        unique: false,
        transaction,
      });
      await queryInterface.addIndex('medication_administrations', {
        name: "medication_administrations_status",
        fields: ["status"],
        unique: false,
        transaction,
      });
      await queryInterface.sequelize.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS "admissions_unique_active_bed"
       ON "admissions" ("bed_id")
     WHERE status IN ('ADMITTED', 'TRANSFERRED') AND "bed_id" IS NOT NULL`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS "admissions_unique_active_patient"
       ON "admissions" ("patient_id")
     WHERE status IN ('ADMITTED', 'TRANSFERRED')`,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    const tables = ["nursing_notes", "medication_administrations", "admissions", "beds", "rooms", "wards"];
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
