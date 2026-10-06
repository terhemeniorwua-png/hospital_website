'use strict';

/** Seeds the hospital departments used across the whole system. */
const DEPARTMENTS = [
  { name: 'General Medicine', code: 'GM', description: 'Primary care and internal medicine', location: 'Block A - Ground floor', phone: '+234 700 000 0001', email: 'general.medicine@hospital.test' },
  { name: 'Paediatrics', code: 'PAED', description: 'Care for infants, children and adolescents', location: 'Block A - First floor', phone: '+234 700 000 0002', email: 'paediatrics@hospital.test' },
  { name: 'Obstetrics & Gynaecology', code: 'OBG', description: 'Antenatal care and gynaecological services', location: 'Block A - First floor', phone: '+234 700 000 0003', email: 'obgyn@hospital.test' },
  { name: 'Surgery', code: 'SURG', description: 'General and orthopaedic surgery', location: 'Block B - Second floor', phone: '+234 700 000 0004', email: 'surgery@hospital.test' },
  { name: 'Orthopaedics', code: 'ORTHO', description: 'Musculoskeletal care and rehabilitation', location: 'Block B - Second floor', phone: '+234 700 000 0005', email: 'orthopaedics@hospital.test' },
  { name: 'Cardiology', code: 'CARD', description: 'Cardiovascular diagnosis and treatment', location: 'Block B - Third floor', phone: '+234 700 000 0006', email: 'cardiology@hospital.test' },
  { name: 'Emergency', code: 'EMER', description: '24 hour emergency and triage', location: 'Emergency wing', phone: '+234 700 000 0007', email: 'emergency@hospital.test', isEmergency: true },
  { name: 'Radiology', code: 'RAD', description: 'Diagnostic imaging', location: 'Block C - Ground floor', phone: '+234 700 000 0008', email: 'radiology@hospital.test' },
  { name: 'Laboratory', code: 'LAB', description: 'Clinical laboratory services', location: 'Block C - Ground floor', phone: '+234 700 000 0009', email: 'laboratory@hospital.test' },
  { name: 'Pharmacy', code: 'PHARM', description: 'Dispensing and medicines management', location: 'Block C - Ground floor', phone: '+234 700 000 0010', email: 'pharmacy@hospital.test' },
  { name: 'Inpatient / Ward', code: 'WARD', description: 'Inpatient wards and bed management', location: 'Wards block', phone: '+234 700 000 0011', email: 'ward@hospital.test' },
  { name: 'Billing & Accounts', code: 'BILL', description: 'Invoicing, payments and insurance claims', location: 'Block A - Ground floor', phone: '+234 700 000 0012', email: 'billing@hospital.test' },
];

module.exports = {
  async up() {
    const { Department } = require('../models');

    for (const department of DEPARTMENTS) {
      // eslint-disable-next-line no-await-in-loop
      await Department.findOrCreate({
        where: { code: department.code },
        defaults: { ...department, isEmergency: !!department.isEmergency, isActive: true },
      });
    }

    console.log(`  departments: ${DEPARTMENTS.length}`);
  },

  async down() {
    const { Department } = require('../models');
    await Department.destroy({ where: {}, truncate: false });
  },
};
