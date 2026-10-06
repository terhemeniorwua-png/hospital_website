/**
 * Model registry + association map.
 *
 * Every model is required here exactly once and all associations are declared
 * in one place so eager loading never depends on import order.
 */
const { sequelize } = require('../config/database');

const Role = require('./role.model');
const Permission = require('./permission.model');
const RolePermission = require('./rolePermission.model');
const Department = require('./department.model');
const User = require('./user.model');
const RefreshToken = require('./refreshToken.model');
const PasswordReset = require('./passwordReset.model');
const Patient = require('./patient.model');
const Doctor = require('./doctor.model');
const Nurse = require('./nurse.model');
const Staff = require('./staff.model');
const DepartmentStaff = require('./departmentStaff.model');
const AppointmentSlot = require('./appointmentSlot.model');
const Appointment = require('./appointment.model');
const QueueEntry = require('./queueEntry.model');
const Consultation = require('./consultation.model');
const MedicalRecord = require('./medicalRecord.model');
const VitalSign = require('./vitalSign.model');
const Diagnosis = require('./diagnosis.model');
const MedicalCondition = require('./medicalCondition.model');
const Allergy = require('./allergy.model');
const MedicalHistory = require('./medicalHistory.model');
const LaboratoryTest = require('./laboratoryTest.model');
const LaboratoryOrder = require('./laboratoryOrder.model');
const LaboratoryOrderItem = require('./laboratoryOrderItem.model');
const LaboratoryResult = require('./laboratoryResult.model');
const ImagingOrder = require('./imagingOrder.model');
const Supplier = require('./supplier.model');
const Medication = require('./medication.model');
const PharmacyInventory = require('./pharmacyInventory.model');
const InventoryTransaction = require('./inventoryTransaction.model');
const Prescription = require('./prescription.model');
const PrescriptionItem = require('./prescriptionItem.model');
const Ward = require('./ward.model');
const Room = require('./room.model');
const Bed = require('./bed.model');
const Admission = require('./admission.model');
const NursingNote = require('./nursingNote.model');
const MedicationAdministration = require('./medicationAdministration.model');
const EmergencyCase = require('./emergencyCase.model');
const Invoice = require('./invoice.model');
const InvoiceItem = require('./invoiceItem.model');
const Payment = require('./payment.model');
const InsuranceProvider = require('./insuranceProvider.model');
const InsurancePolicy = require('./insurancePolicy.model');
const InsuranceClaim = require('./insuranceClaim.model');
const Notification = require('./notification.model');
const Conversation = require('./conversation.model');
const ConversationParticipant = require('./conversationParticipant.model');
const Message = require('./message.model');
const Document = require('./document.model');
const AuditLog = require('./auditLog.model');

/* ------------------------------------------------------------------ *
 * Associations
 * ------------------------------------------------------------------ */

// Roles & permissions
Role.hasMany(RolePermission, { as: 'rolePermissions', foreignKey: 'roleId' });
RolePermission.belongsTo(Role, { as: 'role', foreignKey: 'roleId' });
Permission.hasMany(RolePermission, { as: 'rolePermissions', foreignKey: 'permissionId' });
RolePermission.belongsTo(Permission, { as: 'permission', foreignKey: 'permissionId' });
Role.belongsToMany(Permission, {
  as: 'permissions',
  through: RolePermission,
  foreignKey: 'roleId',
  otherKey: 'permissionId',
});

// Users
User.belongsTo(Role, { as: 'role', foreignKey: 'roleId' });
Role.hasMany(User, { as: 'users', foreignKey: 'roleId' });
User.belongsTo(Patient, { as: 'patient', foreignKey: 'patientId' });
Patient.hasOne(User, { as: 'user', foreignKey: 'patientId' });
User.hasMany(RefreshToken, { as: 'refreshTokens', foreignKey: 'userId', onDelete: 'CASCADE' });
RefreshToken.belongsTo(User, { as: 'user', foreignKey: 'userId' });
User.hasMany(PasswordReset, { as: 'passwordResets', foreignKey: 'userId', onDelete: 'CASCADE' });
PasswordReset.belongsTo(User, { as: 'user', foreignKey: 'userId' });
User.belongsToMany(Department, {
  as: 'assignedDepartments',
  through: DepartmentStaff,
  foreignKey: 'userId',
  otherKey: 'departmentId',
});
Department.belongsToMany(User, {
  as: 'assignedStaff',
  through: DepartmentStaff,
  foreignKey: 'departmentId',
  otherKey: 'userId',
});

// Clinical staff profiles
User.hasOne(Doctor, { as: 'doctorProfile', foreignKey: 'userId' });
Doctor.belongsTo(User, { as: 'user', foreignKey: 'userId' });
User.hasOne(Nurse, { as: 'nurseProfile', foreignKey: 'userId' });
Nurse.belongsTo(User, { as: 'user', foreignKey: 'userId' });
User.hasOne(Staff, { as: 'staffProfile', foreignKey: 'userId' });
Staff.belongsTo(User, { as: 'user', foreignKey: 'userId' });

// Departments
Department.hasMany(Doctor, { as: 'doctors', foreignKey: 'departmentId' });
Doctor.belongsTo(Department, { as: 'department', foreignKey: 'departmentId' });
Department.hasMany(Nurse, { as: 'nurses', foreignKey: 'departmentId' });
Nurse.belongsTo(Department, { as: 'department', foreignKey: 'departmentId' });
Department.hasMany(Staff, { as: 'staff', foreignKey: 'departmentId' });
Staff.belongsTo(Department, { as: 'department', foreignKey: 'departmentId' });
Department.hasMany(DepartmentStaff, { as: 'assignments', foreignKey: 'departmentId' });
DepartmentStaff.belongsTo(Department, { as: 'department', foreignKey: 'departmentId' });
DepartmentStaff.belongsTo(User, { as: 'user', foreignKey: 'userId' });

// Patients <-> clinical records
Patient.hasMany(Appointment, { as: 'appointments', foreignKey: 'patientId' });
Appointment.belongsTo(Patient, { as: 'patient', foreignKey: 'patientId' });
Patient.hasMany(QueueEntry, { as: 'queueEntries', foreignKey: 'patientId' });
QueueEntry.belongsTo(Patient, { as: 'patient', foreignKey: 'patientId' });
Patient.hasMany(Consultation, { as: 'consultations', foreignKey: 'patientId' });
Consultation.belongsTo(Patient, { as: 'patient', foreignKey: 'patientId' });
Patient.hasMany(MedicalRecord, { as: 'medicalRecords', foreignKey: 'patientId' });
MedicalRecord.belongsTo(Patient, { as: 'patient', foreignKey: 'patientId' });
Patient.hasMany(VitalSign, { as: 'vitalSigns', foreignKey: 'patientId' });
VitalSign.belongsTo(Patient, { as: 'patient', foreignKey: 'patientId' });
Patient.hasMany(Diagnosis, { as: 'diagnoses', foreignKey: 'patientId' });
Diagnosis.belongsTo(Patient, { as: 'patient', foreignKey: 'patientId' });
Patient.hasMany(MedicalCondition, { as: 'conditions', foreignKey: 'patientId' });
MedicalCondition.belongsTo(Patient, { as: 'patient', foreignKey: 'patientId' });
Patient.hasMany(Allergy, { as: 'allergyRecords', foreignKey: 'patientId' });
Allergy.belongsTo(Patient, { as: 'patient', foreignKey: 'patientId' });
Patient.hasMany(MedicalHistory, { as: 'history', foreignKey: 'patientId' });
MedicalHistory.belongsTo(Patient, { as: 'patient', foreignKey: 'patientId' });

// Appointments & slots
Doctor.hasMany(AppointmentSlot, { as: 'slots', foreignKey: 'doctorId' });
AppointmentSlot.belongsTo(Doctor, { as: 'doctor', foreignKey: 'doctorId' });
// A booked appointment points at the slot it occupies (`appointments.slot_id`);
// the inverse column does not exist, which keeps the two tables free of a
// circular foreign key.
Appointment.belongsTo(AppointmentSlot, { as: 'slot', foreignKey: 'slotId' });
AppointmentSlot.hasOne(Appointment, { as: 'appointment', foreignKey: 'slotId' });
Doctor.hasMany(Appointment, { as: 'appointments', foreignKey: 'doctorId' });
Appointment.belongsTo(Doctor, { as: 'doctor', foreignKey: 'doctorId' });
Department.hasMany(Appointment, { as: 'appointments', foreignKey: 'departmentId' });
Appointment.belongsTo(Department, { as: 'department', foreignKey: 'departmentId' });
// The link between an appointment and its waiting-room ticket is the
// `queue_entries.appointment_id` column; the inverse column does not exist to
// avoid a circular foreign key.
QueueEntry.belongsTo(Appointment, { as: 'appointment', foreignKey: 'appointmentId' });
Appointment.hasOne(QueueEntry, { as: 'queueEntry', foreignKey: 'appointmentId' });

// Queue
Department.hasMany(QueueEntry, { as: 'queueEntries', foreignKey: 'departmentId' });
QueueEntry.belongsTo(Department, { as: 'department', foreignKey: 'departmentId' });
Doctor.hasMany(QueueEntry, { as: 'queueEntries', foreignKey: 'doctorId' });
QueueEntry.belongsTo(Doctor, { as: 'doctor', foreignKey: 'doctorId' });

// Consultations
Doctor.hasMany(Consultation, { as: 'consultations', foreignKey: 'doctorId' });
Consultation.belongsTo(Doctor, { as: 'doctor', foreignKey: 'doctorId' });
Department.hasMany(Consultation, { as: 'consultations', foreignKey: 'departmentId' });
Consultation.belongsTo(Department, { as: 'department', foreignKey: 'departmentId' });
Appointment.hasMany(Consultation, { as: 'consultations', foreignKey: 'appointmentId' });
Consultation.belongsTo(Appointment, { as: 'appointment', foreignKey: 'appointmentId' });
QueueEntry.hasOne(Consultation, { as: 'consultation', foreignKey: 'queueEntryId' });
Consultation.hasMany(Diagnosis, { as: 'diagnoses', foreignKey: 'consultationId' });
Diagnosis.belongsTo(Consultation, { as: 'consultation', foreignKey: 'consultationId' });
Consultation.hasMany(VitalSign, { as: 'vitalSigns', foreignKey: 'consultationId' });
VitalSign.belongsTo(Consultation, { as: 'consultation', foreignKey: 'consultationId' });
Consultation.hasMany(LaboratoryOrder, { as: 'laboratoryOrders', foreignKey: 'consultationId' });
LaboratoryOrder.belongsTo(Consultation, { as: 'consultation', foreignKey: 'consultationId' });
Consultation.hasMany(ImagingOrder, { as: 'imagingOrders', foreignKey: 'consultationId' });
ImagingOrder.belongsTo(Consultation, { as: 'consultation', foreignKey: 'consultationId' });
Consultation.hasMany(Prescription, { as: 'prescriptions', foreignKey: 'consultationId' });
Prescription.belongsTo(Consultation, { as: 'consultation', foreignKey: 'consultationId' });
Diagnosis.belongsTo(User, { as: 'diagnosedByUser', foreignKey: 'diagnosedBy' });
Consultation.belongsTo(User, { as: 'createdByUser', foreignKey: 'createdBy' });

// Laboratory
LaboratoryTest.hasMany(LaboratoryOrderItem, { as: 'orderItems', foreignKey: 'laboratoryTestId' });
LaboratoryOrderItem.belongsTo(LaboratoryTest, { as: 'test', foreignKey: 'laboratoryTestId' });
LaboratoryOrder.hasMany(LaboratoryOrderItem, { as: 'items', foreignKey: 'orderId' });
LaboratoryOrderItem.belongsTo(LaboratoryOrder, { as: 'order', foreignKey: 'orderId' });
LaboratoryOrder.hasMany(LaboratoryResult, { as: 'results', foreignKey: 'orderId' });
LaboratoryResult.belongsTo(LaboratoryOrder, { as: 'order', foreignKey: 'orderId' });
LaboratoryOrderItem.hasOne(LaboratoryResult, { as: 'result', foreignKey: 'orderItemId' });
LaboratoryResult.belongsTo(LaboratoryOrderItem, { as: 'orderItem', foreignKey: 'orderItemId' });
LaboratoryResult.belongsTo(LaboratoryTest, { as: 'test', foreignKey: 'laboratoryTestId' });
Patient.hasMany(LaboratoryOrder, { as: 'laboratoryOrders', foreignKey: 'patientId' });
LaboratoryOrder.belongsTo(Patient, { as: 'patient', foreignKey: 'patientId' });
LaboratoryOrder.belongsTo(User, { as: 'orderedByUser', foreignKey: 'orderedBy' });
User.hasMany(LaboratoryOrder, { as: 'orderedLaboratoryOrders', foreignKey: 'orderedBy' });
LaboratoryResult.belongsTo(User, { as: 'performedByUser', foreignKey: 'performedBy' });
LaboratoryResult.belongsTo(User, { as: 'publishedByUser', foreignKey: 'publishedBy' });
Admission.hasMany(LaboratoryOrder, { as: 'laboratoryOrders', foreignKey: 'admissionId' });
LaboratoryOrder.belongsTo(Admission, { as: 'admission', foreignKey: 'admissionId' });

// Imaging
Patient.hasMany(ImagingOrder, { as: 'imagingOrders', foreignKey: 'patientId' });
ImagingOrder.belongsTo(Patient, { as: 'patient', foreignKey: 'patientId' });
ImagingOrder.belongsTo(User, { as: 'orderedByUser', foreignKey: 'orderedBy' });
ImagingOrder.belongsTo(User, { as: 'performedByUser', foreignKey: 'performedBy' });

// Pharmacy
Medication.hasMany(PharmacyInventory, { as: 'inventory', foreignKey: 'medicationId' });
PharmacyInventory.belongsTo(Medication, { as: 'medication', foreignKey: 'medicationId' });
Supplier.hasMany(PharmacyInventory, { as: 'inventory', foreignKey: 'supplierId' });
PharmacyInventory.belongsTo(Supplier, { as: 'supplier', foreignKey: 'supplierId' });
PharmacyInventory.hasMany(InventoryTransaction, { as: 'transactions', foreignKey: 'pharmacyInventoryId' });
InventoryTransaction.belongsTo(PharmacyInventory, { as: 'inventory', foreignKey: 'pharmacyInventoryId' });
InventoryTransaction.belongsTo(Medication, { as: 'medication', foreignKey: 'medicationId' });
InventoryTransaction.belongsTo(User, { as: 'performedByUser', foreignKey: 'performedBy' });
Prescription.hasMany(PrescriptionItem, { as: 'items', foreignKey: 'prescriptionId' });
PrescriptionItem.belongsTo(Prescription, { as: 'prescription', foreignKey: 'prescriptionId' });
PrescriptionItem.belongsTo(Medication, { as: 'medication', foreignKey: 'medicationId' });
Medication.hasMany(PrescriptionItem, { as: 'prescriptionItems', foreignKey: 'medicationId' });
Patient.hasMany(Prescription, { as: 'prescriptions', foreignKey: 'patientId' });
Prescription.belongsTo(Patient, { as: 'patient', foreignKey: 'patientId' });
Doctor.hasMany(Prescription, { as: 'prescriptions', foreignKey: 'prescribedBy' });
Prescription.belongsTo(Doctor, { as: 'prescribedByDoctor', foreignKey: 'prescribedBy' });
Prescription.belongsTo(User, { as: 'prescribingUser', foreignKey: 'prescribedByUser' });
Prescription.belongsTo(User, { as: 'verifiedByUser', foreignKey: 'verifiedBy' });
Prescription.belongsTo(User, { as: 'dispensedByUser', foreignKey: 'dispensedBy' });
PrescriptionItem.hasMany(MedicationAdministration, { as: 'administrations', foreignKey: 'prescriptionItemId' });
MedicationAdministration.belongsTo(PrescriptionItem, { as: 'prescriptionItem', foreignKey: 'prescriptionItemId' });

// Inpatient: ward -> room -> bed -> admission
Ward.hasMany(Room, { as: 'rooms', foreignKey: 'wardId' });
Room.belongsTo(Ward, { as: 'ward', foreignKey: 'wardId' });
Room.hasMany(Bed, { as: 'beds', foreignKey: 'roomId' });
Bed.belongsTo(Room, { as: 'room', foreignKey: 'roomId' });
Bed.belongsTo(Ward, { as: 'ward', foreignKey: 'wardId' });
Ward.hasMany(Bed, { as: 'beds', foreignKey: 'wardId' });
Ward.belongsTo(Department, { as: 'department', foreignKey: 'departmentId' });
Department.hasMany(Ward, { as: 'wards', foreignKey: 'departmentId' });
Patient.hasMany(Admission, { as: 'admissions', foreignKey: 'patientId' });
Admission.belongsTo(Patient, { as: 'patient', foreignKey: 'patientId' });
Admission.belongsTo(Ward, { as: 'ward', foreignKey: 'wardId' });
Admission.belongsTo(Room, { as: 'room', foreignKey: 'roomId' });
Admission.belongsTo(Bed, { as: 'bed', foreignKey: 'bedId' });
Bed.hasMany(Admission, { as: 'admissions', foreignKey: 'bedId' });
Room.hasMany(Admission, { as: 'admissions', foreignKey: 'roomId' });
Ward.hasMany(Admission, { as: 'admissions', foreignKey: 'wardId' });
Doctor.hasMany(Admission, { as: 'admissions', foreignKey: 'attendingDoctorId' });
Admission.belongsTo(Doctor, { as: 'attendingDoctor', foreignKey: 'attendingDoctorId' });
Admission.belongsTo(User, { as: 'admittedByUser', foreignKey: 'admittedBy' });
User.hasMany(Admission, { as: 'admittedPatients', foreignKey: 'admittedBy' });
Admission.belongsTo(User, { as: 'dischargedByUser', foreignKey: 'dischargedBy' });

// Nursing
Patient.hasMany(NursingNote, { as: 'nursingNotes', foreignKey: 'patientId' });
NursingNote.belongsTo(Patient, { as: 'patient', foreignKey: 'patientId' });
Admission.hasMany(NursingNote, { as: 'nursingNotes', foreignKey: 'admissionId' });
NursingNote.belongsTo(Admission, { as: 'admission', foreignKey: 'admissionId' });
NursingNote.belongsTo(User, { as: 'nurse', foreignKey: 'nurseId' });
Ward.hasMany(NursingNote, { as: 'nursingNotes', foreignKey: 'wardId' });
NursingNote.belongsTo(Ward, { as: 'ward', foreignKey: 'wardId' });
Patient.hasMany(MedicationAdministration, { as: 'medicationAdministrations', foreignKey: 'patientId' });
MedicationAdministration.belongsTo(Patient, { as: 'patient', foreignKey: 'patientId' });
Admission.hasMany(MedicationAdministration, { as: 'medicationAdministrations', foreignKey: 'admissionId' });
MedicationAdministration.belongsTo(Admission, { as: 'admission', foreignKey: 'admissionId' });
MedicationAdministration.belongsTo(User, { as: 'nurse', foreignKey: 'nurseId' });
MedicationAdministration.belongsTo(Medication, { as: 'medication', foreignKey: 'medicationId' });

// Emergency
Patient.hasMany(EmergencyCase, { as: 'emergencyCases', foreignKey: 'patientId' });
EmergencyCase.belongsTo(Patient, { as: 'patient', foreignKey: 'patientId' });
Department.hasMany(EmergencyCase, { as: 'emergencyCases', foreignKey: 'departmentId' });
EmergencyCase.belongsTo(Department, { as: 'department', foreignKey: 'departmentId' });
Doctor.hasMany(EmergencyCase, { as: 'emergencyCases', foreignKey: 'assignedDoctorId' });
EmergencyCase.belongsTo(Doctor, { as: 'assignedDoctor', foreignKey: 'assignedDoctorId' });
EmergencyCase.belongsTo(Admission, { as: 'admission', foreignKey: 'admissionId' });
Admission.hasOne(EmergencyCase, { as: 'emergencyCase', foreignKey: 'emergencyCaseId' });
EmergencyCase.hasMany(VitalSign, { as: 'vitalSigns', foreignKey: 'emergencyCaseId' });
VitalSign.belongsTo(EmergencyCase, { as: 'emergencyCase', foreignKey: 'emergencyCaseId' });
EmergencyCase.belongsTo(User, { as: 'registeredByUser', foreignKey: 'registeredBy' });
User.hasMany(EmergencyCase, { as: 'registeredEmergencyCases', foreignKey: 'registeredBy' });
EmergencyCase.belongsTo(User, { as: 'triagedByUser', foreignKey: 'triagedBy' });

// Billing
Patient.hasMany(Invoice, { as: 'invoices', foreignKey: 'patientId' });
Invoice.belongsTo(Patient, { as: 'patient', foreignKey: 'patientId' });
Invoice.hasMany(InvoiceItem, { as: 'items', foreignKey: 'invoiceId' });
InvoiceItem.belongsTo(Invoice, { as: 'invoice', foreignKey: 'invoiceId' });
Invoice.hasMany(Payment, { as: 'payments', foreignKey: 'invoiceId' });
Payment.belongsTo(Invoice, { as: 'invoice', foreignKey: 'invoiceId' });
Patient.hasMany(Payment, { as: 'payments', foreignKey: 'patientId' });
Payment.belongsTo(Patient, { as: 'patient', foreignKey: 'patientId' });
Payment.belongsTo(User, { as: 'receivedByUser', foreignKey: 'receivedBy' });
Admission.hasMany(Invoice, { as: 'invoices', foreignKey: 'admissionId' });
Invoice.belongsTo(Admission, { as: 'admission', foreignKey: 'admissionId' });
Invoice.belongsTo(Appointment, { as: 'appointment', foreignKey: 'appointmentId' });
User.belongsTo(Invoice, { as: 'invoiceCreatedByUser', foreignKey: 'createdBy' });

// Insurance
InsuranceProvider.hasMany(InsurancePolicy, { as: 'policies', foreignKey: 'providerId' });
InsurancePolicy.belongsTo(InsuranceProvider, { as: 'provider', foreignKey: 'providerId' });
Patient.hasMany(InsurancePolicy, { as: 'insurancePolicies', foreignKey: 'patientId' });
InsurancePolicy.belongsTo(Patient, { as: 'patient', foreignKey: 'patientId' });
InsurancePolicy.hasMany(InsuranceClaim, { as: 'claims', foreignKey: 'policyId' });
InsuranceClaim.belongsTo(InsurancePolicy, { as: 'policy', foreignKey: 'policyId' });
Invoice.hasMany(InsuranceClaim, { as: 'claims', foreignKey: 'invoiceId' });
InsuranceClaim.belongsTo(Invoice, { as: 'invoice', foreignKey: 'invoiceId' });
Patient.hasMany(InsuranceClaim, { as: 'claims', foreignKey: 'patientId' });
InsuranceClaim.belongsTo(Patient, { as: 'patient', foreignKey: 'patientId' });
InsuranceClaim.belongsTo(User, { as: 'reviewedByUser', foreignKey: 'reviewedBy' });

// Notifications
User.hasMany(Notification, { as: 'notifications', foreignKey: 'userId' });
Notification.belongsTo(User, { as: 'user', foreignKey: 'userId' });
Patient.hasMany(Notification, { as: 'notifications', foreignKey: 'patientId' });
Notification.belongsTo(Patient, { as: 'patient', foreignKey: 'patientId' });

// Messaging
Conversation.hasMany(ConversationParticipant, { as: 'participants', foreignKey: 'conversationId' });
ConversationParticipant.belongsTo(Conversation, { as: 'conversation', foreignKey: 'conversationId' });
ConversationParticipant.belongsTo(User, { as: 'user', foreignKey: 'userId' });
User.hasMany(ConversationParticipant, { as: 'conversations', foreignKey: 'userId' });
Conversation.hasMany(Message, { as: 'messages', foreignKey: 'conversationId' });
Message.belongsTo(Conversation, { as: 'conversation', foreignKey: 'conversationId' });
Message.belongsTo(User, { as: 'sender', foreignKey: 'senderId' });
Conversation.belongsTo(Patient, { as: 'patient', foreignKey: 'patientId' });
User.belongsTo(Conversation, { as: 'conversationCreatedByUser', foreignKey: 'createdBy' });

// Documents
Patient.hasMany(Document, { as: 'documents', foreignKey: 'patientId' });
Document.belongsTo(Patient, { as: 'patient', foreignKey: 'patientId' });
User.hasMany(Document, { as: 'uploadedDocuments', foreignKey: 'uploadedBy' });
Document.belongsTo(User, { as: 'uploadedByUser', foreignKey: 'uploadedBy' });
Message.belongsTo(Document, { as: 'document', foreignKey: 'documentId' });

// Audit
User.hasMany(AuditLog, { as: 'auditLogs', foreignKey: 'userId' });
AuditLog.belongsTo(User, { as: 'user', foreignKey: 'userId' });
AuditLog.belongsTo(Patient, { as: 'patient', foreignKey: 'patientId' });
Patient.hasMany(AuditLog, { as: 'auditLogs', foreignKey: 'patientId' });

module.exports = {
  sequelize,
  Sequelize: require('sequelize').Sequelize,
  Op: require('sequelize').Op,
  Role,
  Permission,
  RolePermission,
  Department,
  User,
  RefreshToken,
  PasswordReset,
  Patient,
  Doctor,
  Nurse,
  Staff,
  DepartmentStaff,
  AppointmentSlot,
  Appointment,
  QueueEntry,
  Consultation,
  MedicalRecord,
  VitalSign,
  Diagnosis,
  MedicalCondition,
  Allergy,
  MedicalHistory,
  LaboratoryTest,
  LaboratoryOrder,
  LaboratoryOrderItem,
  LaboratoryResult,
  ImagingOrder,
  Supplier,
  Medication,
  PharmacyInventory,
  InventoryTransaction,
  Prescription,
  PrescriptionItem,
  Ward,
  Room,
  Bed,
  Admission,
  NursingNote,
  MedicationAdministration,
  EmergencyCase,
  Invoice,
  InvoiceItem,
  Payment,
  InsuranceProvider,
  InsurancePolicy,
  InsuranceClaim,
  Notification,
  Conversation,
  ConversationParticipant,
  Message,
  Document,
  AuditLog,
};