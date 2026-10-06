'use strict';

/**
 * Seeds one account per role plus the matching staff / patient profiles.
 *
 * Every demo account uses the same password so the API can be explored without
 * setup; the README documents them. Accounts are looked up by email, so the
 * seeder can be re-run safely.
 */
const { ROLES, USER_STATUS, STAFF_TYPES, PATIENT_STATUS, GENDERS } = require('../config/constants');
const { hashSync } = require('../utils/password');
const { nextUniqueHospitalNumber } = require('../utils/codeGenerator');

const DEMO_PASSWORD = 'Password123!';

const ACCOUNTS = [
  { email: 'superadmin@hospital.test', firstName: 'Super', lastName: 'Admin', role: ROLES.SUPER_ADMIN, employeeId: 'HOSP-0001' },
  { email: 'admin@hospital.test', firstName: 'Ada', lastName: 'Okafor', role: ROLES.HOSPITAL_ADMIN, employeeId: 'HOSP-0002' },
  { email: 'doctor@hospital.test', firstName: 'Grace', lastName: 'Eze', role: ROLES.DOCTOR, employeeId: 'HOSP-0003' },
  { email: 'doctor2@hospital.test', firstName: 'Tunde', lastName: 'Balogun', role: ROLES.DOCTOR, employeeId: 'HOSP-0004' },
  { email: 'nurse@hospital.test', firstName: 'Ngozi', lastName: 'Ibrahim', role: ROLES.NURSE, employeeId: 'HOSP-0005' },
  { email: 'pharmacist@hospital.test', firstName: 'Kelechi', lastName: 'Nkem', role: ROLES.PHARMACIST, employeeId: 'HOSP-0006' },
  { email: 'lab@hospital.test', firstName: 'Bisi', lastName: 'Adeleke', role: ROLES.LAB_TECHNICIAN, employeeId: 'HOSP-0007' },
  { email: 'radiology@hospital.test', firstName: 'Chidi', lastName: 'Obi', role: ROLES.RADIOLOGIST, employeeId: 'HOSP-0008' },
  { email: 'reception@hospital.test', firstName: 'Amaka', lastName: 'Uche', role: ROLES.RECEPTIONIST, employeeId: 'HOSP-0009' },
  { email: 'accountant@hospital.test', firstName: 'Emeka', lastName: 'Nwosu', role: ROLES.ACCOUNTANT, employeeId: 'HOSP-0010' },
  { email: 'patient@hospital.test', firstName: 'Chioma', lastName: 'Okonkwo', role: ROLES.PATIENT },
];

module.exports = {
  async up() {
    const { Role, User, Patient, Doctor, Nurse, Staff, Department, DepartmentStaff } = require('../models');

    const passwordHash = hashSync(DEMO_PASSWORD);

    const roles = new Map((await Role.findAll()).map((role) => [role.name, role]));
    const departments = new Map((await Department.findAll()).map((d) => [d.code, d]));

    const users = new Map();

    for (const account of ACCOUNTS) {
      const role = roles.get(account.role);
      if (!role) continue;

      // eslint-disable-next-line no-await-in-loop
      const [user] = await User.findOrCreate({
        where: { email: account.email },
        defaults: {
          firstName: account.firstName,
          lastName: account.lastName,
          email: account.email,
          phone: '+234 800 000 0000',
          passwordHash,
          roleId: role.id,
          status: USER_STATUS.ACTIVE,
          emailVerifiedAt: new Date(),
          mustChangePassword: false,
          employeeId: account.employeeId,
        },
      });

      if (!user.passwordHash) await user.update({ passwordHash });
      users.set(account.email, user);
    }

    // Patients get a patient record and a link from the user account to it.
    const patientUser = users.get('patient@hospital.test');
    if (patientUser && !patientUser.patientId) {
      // eslint-disable-next-line no-await-in-loop
      const hospitalNumber = await nextUniqueHospitalNumber();
      // eslint-disable-next-line no-await-in-loop
      const [patient] = await Patient.findOrCreate({
        where: { hospitalNumber },
        defaults: {
          hospitalNumber,
          firstName: patientUser.firstName,
          lastName: patientUser.lastName,
          dateOfBirth: '1995-04-12',
          gender: GENDERS.FEMALE,
          phone: patientUser.phone,
          email: patientUser.email,
          address: '12 Banana Street',
          city: 'Lagos',
          state: 'Lagos',
          bloodGroup: 'O+',
          emergencyContactName: 'Chinedu Okonkwo',
          emergencyContactPhone: '+234 800 000 0011',
          emergencyContactRelationship: 'Spouse',
          status: PATIENT_STATUS.ACTIVE,
        },
      });
      await patientUser.update({ patientId: patient.id });
    }

    const generalMedicine = departments.get('GM');
    const ward = departments.get('WARD');

    const ensureProfile = async (email, builder) => {
      const user = users.get(email);
      if (user) await builder(user);
    };

    await ensureProfile('doctor@hospital.test', (user) =>
      Doctor.findOrCreate({
        where: { userId: user.id },
        defaults: {
          userId: user.id,
          departmentId: generalMedicine.id,
          specialization: 'Internal Medicine',
          subSpecialization: 'Infectious diseases',
          licenseNumber: 'MD/NG/1001',
          qualification: 'MBBS, FWACP',
          yearsOfExperience: 12,
          consultationFee: 15000,
          slotDurationMinutes: 30,
          isAcceptingAppointments: true,
          isOnDuty: true,
        },
      }),
    );

    await ensureProfile('doctor2@hospital.test', (user) =>
      Doctor.findOrCreate({
        where: { userId: user.id },
        defaults: {
          userId: user.id,
          departmentId: departments.get('ORTHO').id,
          specialization: 'Orthopaedics',
          licenseNumber: 'MD/NG/1002',
          qualification: 'MBBS, FWCS (Ortho)',
          yearsOfExperience: 8,
          consultationFee: 20000,
          slotDurationMinutes: 45,
          isAcceptingAppointments: true,
          isOnDuty: false,
        },
      }),
    );

    await ensureProfile('nurse@hospital.test', (user) =>
      Nurse.findOrCreate({
        where: { userId: user.id },
        defaults: {
          userId: user.id,
          departmentId: ward.id,
          qualification: 'BSc Nursing, RCN',
          registrationNumber: 'RNC/2201',
          specialization: 'Emergency nursing',
          shift: 'DAY',
          isOnDuty: true,
        },
      }),
    );

    const staffProfiles = [
      ['pharmacist@hospital.test', STAFF_TYPES.PHARMACIST, departments.get('PHARM').id, 'Pharmacist', 'PH-0021'],
      ['lab@hospital.test', STAFF_TYPES.LAB_TECHNICIAN, departments.get('LAB').id, 'Senior Laboratory Scientist', 'PH-0022'],
      ['radiology@hospital.test', STAFF_TYPES.RADIOLOGIST, departments.get('RAD').id, 'Radiographer', 'PH-0023'],
      ['reception@hospital.test', STAFF_TYPES.RECEPTIONIST, departments.get('GM').id, 'Front Desk Officer', 'PH-0024'],
      ['accountant@hospital.test', STAFF_TYPES.ACCOUNTANT, departments.get('BILL').id, 'Accounts Officer', 'PH-0025'],
    ];

    for (const [email, staffType, departmentId, jobTitle, employeeNumber] of staffProfiles) {
      // eslint-disable-next-line no-await-in-loop
      await ensureProfile(email, (user) =>
        Staff.findOrCreate({
          where: { userId: user.id },
          defaults: {
            userId: user.id,
            departmentId,
            staffType,
            jobTitle,
            employeeNumber,
            dateEmployed: '2023-01-09',
          },
        }),
      );
    }

    // Department assignments used by the dashboard and scheduling filters.
    const assignments = [
      ['doctor@hospital.test', departments.get('GM').id, 'Consultant', true],
      ['doctor2@hospital.test', departments.get('ORTHO').id, 'Consultant', true],
      ['nurse@hospital.test', ward.id, 'Charge nurse', true],
      ['pharmacist@hospital.test', departments.get('PHARM').id, 'Pharmacist', true],
      ['lab@hospital.test', departments.get('LAB').id, 'Laboratory scientist', true],
      ['radiology@hospital.test', departments.get('RAD').id, 'Radiographer', true],
      ['reception@hospital.test', departments.get('GM').id, 'Receptionist', true],
      ['accountant@hospital.test', departments.get('BILL').id, 'Accountant', true],
      ['admin@hospital.test', generalMedicine.id, 'Administrator', true],
    ];

    for (const [email, departmentId, roleInDepartment, isPrimary] of assignments) {
      const user = users.get(email);
      if (!user) continue;
      // eslint-disable-next-line no-await-in-loop
      await DepartmentStaff.findOrCreate({
        where: { userId: user.id, departmentId },
        defaults: { userId: user.id, departmentId, roleInDepartment, isPrimary },
      });
    }

    console.log(`  users: ${users.size} (password: ${DEMO_PASSWORD})`);
  },

  async down() {
    const { DepartmentStaff, Staff, Nurse, Doctor, Patient, User } = require('../models');
    const emails = ACCOUNTS.map((a) => a.email);

    await DepartmentStaff.destroy({ where: {}, truncate: false });
    await Staff.destroy({ where: {}, truncate: false });
    await Nurse.destroy({ where: {}, truncate: false });
    await Doctor.destroy({ where: {}, truncate: false });
    await User.destroy({ where: { email: emails }, truncate: false });
    await Patient.destroy({ where: { email: emails }, truncate: false });
  },
};
