'use strict';

/** Seeds suppliers, the medication catalogue and opening stock batches. */
const day = 24 * 60 * 60 * 1000;
const inDays = (days) => new Date(Date.now() + days * day).toISOString().slice(0, 10);

const SUPPLIERS = [
  { name: 'Emzor Pharma Nigeria Ltd', contactPerson: 'Chukwuemeka Eze', phone: '+234 802 100 0001', email: 'orders@emzor.test', address: '1 Sterling Avenue, Lagos' },
  { name: ' Fidowson Pharmaceuticals', contactPerson: 'Aisha Bello', phone: '+234 802 100 0002', email: 'supply@fidowson.test', address: '14 Obafemi Awolowo Way, Abuja' },
  { name: 'Neopharma Lifesciences', contactPerson: 'Segun Lawal', phone: '+234 802 100 0003', email: 'sales@neopharma.test', address: '5 Plot 52, Gbagada, Lagos' },
];

const MEDICATIONS = [
  { code: 'MED-PARA500', name: 'Paracetamol 500mg', genericName: 'Paracetamol', brandName: 'Panadol', form: 'Tablet', strength: '500mg', unitPrice: 200, reorderLevel: 500, unitOfMeasure: 'tablet', storageConditions: 'Room temperature', requiresPrescription: false, quantity: 5000, supplier: 0 },
  { code: 'MED-IBU400', name: 'Ibuprofen 400mg', genericName: 'Ibuprofen', brandName: 'Brufen', form: 'Tablet', strength: '400mg', unitPrice: 350, reorderLevel: 300, unitOfMeasure: 'tablet', storageConditions: 'Room temperature', requiresPrescription: false, quantity: 2400, supplier: 0 },
  { code: 'MED-AMOX500', name: 'Amoxicillin 500mg', genericName: 'Amoxicillin', brandName: 'Amoxil', form: 'Capsule', strength: '500mg', unitPrice: 600, reorderLevel: 400, unitOfMeasure: 'capsule', storageConditions: 'Cool dry place', requiresPrescription: true, quantity: 1800, supplier: 0 },
  { code: 'MED-CEF1', name: 'Cefixime 200mg', genericName: 'Cefixime', brandName: 'Suprax', form: 'Capsule', strength: '200mg', unitPrice: 1100, reorderLevel: 200, unitOfMeasure: 'capsule', storageConditions: 'Cool dry place', requiresPrescription: true, quantity: 900, supplier: 1 },
  { code: 'MED-METF500', name: 'Metformin 500mg', genericName: 'Metformin', brandName: 'Glucophage', form: 'Tablet', strength: '500mg', unitPrice: 280, reorderLevel: 600, unitOfMeasure: 'tablet', storageConditions: 'Room temperature', requiresPrescription: true, quantity: 3600, supplier: 1 },
  { code: 'MED-AML5', name: 'Amlodipine 5mg', genericName: 'Amlodipine', brandName: 'Norvasc', form: 'Tablet', strength: '5mg', unitPrice: 420, reorderLevel: 400, unitOfMeasure: 'tablet', storageConditions: 'Room temperature', requiresPrescription: true, quantity: 2100, supplier: 1 },
  { code: 'MED-ORS', name: 'Oral Rehydration Salts', genericName: 'Oral rehydration salts', brandName: 'UNICEF ORS', form: 'Sachet', strength: '20.5g', unitPrice: 120, reorderLevel: 800, unitOfMeasure: 'sachet', storageConditions: 'Room temperature', requiresPrescription: false, quantity: 4000, supplier: 2 },
  { code: 'MED-ART', name: 'Artemether/Lumefantrine 20/120mg', genericName: 'Artemether/Lumefantrine', brandName: 'Coartem', form: 'Tablet', strength: '20/120mg', unitPrice: 380, reorderLevel: 600, unitOfMeasure: 'tablet', storageConditions: 'Below 25C', requiresPrescription: true, quantity: 3000, supplier: 2 },
  { code: 'MED-CEFTRIAX', name: 'Ceftriaxone 1g', genericName: 'Ceftriaxone', brandName: 'Rocephin', form: 'Injection', strength: '1g', unitPrice: 2500, reorderLevel: 100, unitOfMeasure: 'vial', storageConditions: 'Refrigerated 2-8C', requiresPrescription: true, quantity: 240, supplier: 2 },
  { code: 'MED-SALB', name: 'Salbutamol Inhaler 100mcg', genericName: 'Salbutamol', brandName: 'Ventolin', form: 'Inhaler', strength: '100mcg/dose', unitPrice: 4800, reorderLevel: 60, unitOfMeasure: 'inhaler', storageConditions: 'Room temperature', requiresPrescription: true, quantity: 120, supplier: 0 },
  { code: 'MED-ONDAN', name: 'Ondansetron 8mg', genericName: 'Ondansetron', brandName: 'Zofran', form: 'Injection', strength: '8mg/2ml', unitPrice: 900, reorderLevel: 80, unitOfMeasure: 'ampoule', storageConditions: 'Room temperature', requiresPrescription: true, quantity: 200, supplier: 1 },
  { code: 'MED-SYRUP', name: 'Paracetamol Syrup 100mg/5ml', genericName: 'Paracetamol', brandName: 'Parakid', form: 'Syrup', strength: '100mg/5ml', unitPrice: 900, reorderLevel: 100, unitOfMeasure: 'bottle', storageConditions: 'Room temperature', requiresPrescription: false, quantity: 150, supplier: 0 },
];

module.exports = {
  async up() {
    const { Supplier, Medication, PharmacyInventory } = require('../models');

    const suppliers = [];
    for (const supplier of SUPPLIERS) {
      // eslint-disable-next-line no-await-in-loop
      const [row] = await Supplier.findOrCreate({ where: { name: supplier.name }, defaults: { ...supplier, isActive: true } });
      suppliers.push(row);
    }

    for (const medication of MEDICATIONS) {
      // eslint-disable-next-line no-await-in-loop
      const [row] = await Medication.findOrCreate({
        where: { code: medication.code },
        defaults: {
          code: medication.code,
          name: medication.name,
          genericName: medication.genericName,
          brandName: medication.brandName,
          form: medication.form,
          strength: medication.strength,
          manufacturer: suppliers[medication.supplier].name,
          unitPrice: medication.unitPrice,
          requiresPrescription: medication.requiresPrescription,
          reorderLevel: medication.reorderLevel,
          unitOfMeasure: medication.unitOfMeasure,
          storageConditions: medication.storageConditions,
          isActive: true,
        },
      });

      // eslint-disable-next-line no-await-in-loop
      await PharmacyInventory.findOrCreate({
        where: { medicationId: row.id, batchNumber: `BATCH-${medication.code}` },
        defaults: {
          medicationId: row.id,
          supplierId: suppliers[medication.supplier].id,
          batchNumber: `BATCH-${medication.code}`,
          quantity: medication.quantity,
          expiryDate: inDays(180 + Math.floor(Math.random() * 180)),
          unitPrice: medication.unitPrice,
          reorderLevel: medication.reorderLevel,
          shelfLocation: `RACK ${String.fromCharCode(65 + (medication.supplier % 6))}-${medication.reorderLevel % 20}`,
          isActive: true,
          lastRestockedAt: new Date(),
        },
      });
    }

    console.log(`  suppliers: ${suppliers.length}, medications: ${MEDICATIONS.length}, stock batches: ${MEDICATIONS.length}`);
  },

  async down() {
    const { PharmacyInventory, Medication, Supplier } = require('../models');
    await PharmacyInventory.destroy({ where: {}, truncate: false });
    await Medication.destroy({ where: {}, truncate: false });
    await Supplier.destroy({ where: {}, truncate: false });
  },
};

module.exports.MEDICATIONS = MEDICATIONS;
