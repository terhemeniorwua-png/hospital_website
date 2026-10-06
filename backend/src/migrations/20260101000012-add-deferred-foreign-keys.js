'use strict';

/**
 * Foreign keys whose referenced table is created by a later migration
 * (for example `users.patient_id -> patients`). They are attached last so
 * that every table already exists.
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addConstraint('users', {
        fields: ['patient_id'],
        type: 'foreign key',
        name: "users_patient_id_fk",
        references: { table: 'patients', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('consultations', {
        fields: ['admission_id'],
        type: 'foreign key',
        name: "consultations_admission_id_fk",
        references: { table: 'admissions', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('medical_records', {
        fields: ['admission_id'],
        type: 'foreign key',
        name: "medical_records_admission_id_fk",
        references: { table: 'admissions', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('vital_signs', {
        fields: ['admission_id'],
        type: 'foreign key',
        name: "vital_signs_admission_id_fk",
        references: { table: 'admissions', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('vital_signs', {
        fields: ['emergency_case_id'],
        type: 'foreign key',
        name: "vital_signs_emergency_case_id_fk",
        references: { table: 'emergency_cases', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('laboratory_orders', {
        fields: ['admission_id'],
        type: 'foreign key',
        name: "laboratory_orders_admission_id_fk",
        references: { table: 'admissions', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('imaging_orders', {
        fields: ['admission_id'],
        type: 'foreign key',
        name: "imaging_orders_admission_id_fk",
        references: { table: 'admissions', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
      await queryInterface.addConstraint('admissions', {
        fields: ['emergency_case_id'],
        type: 'foreign key',
        name: "admissions_emergency_case_id_fk",
        references: { table: 'emergency_cases', field: 'id' },
        onDelete: "CASCADE",
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeConstraint('admissions', "admissions_emergency_case_id_fk", { transaction });
      await queryInterface.removeConstraint('imaging_orders', "imaging_orders_admission_id_fk", { transaction });
      await queryInterface.removeConstraint('laboratory_orders', "laboratory_orders_admission_id_fk", { transaction });
      await queryInterface.removeConstraint('vital_signs', "vital_signs_emergency_case_id_fk", { transaction });
      await queryInterface.removeConstraint('vital_signs', "vital_signs_admission_id_fk", { transaction });
      await queryInterface.removeConstraint('medical_records', "medical_records_admission_id_fk", { transaction });
      await queryInterface.removeConstraint('consultations', "consultations_admission_id_fk", { transaction });
      await queryInterface.removeConstraint('users', "users_patient_id_fk", { transaction });
    });
  },
};
