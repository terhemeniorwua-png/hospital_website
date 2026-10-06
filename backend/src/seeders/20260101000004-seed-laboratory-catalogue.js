'use strict';

/** Seeds the laboratory test catalogue. */
const LABORATORY_TESTS = [
  { code: 'LAB-CBC', name: 'Complete Blood Count', category: 'Haematology', specimen: 'EDTA whole blood', method: 'Automated analyser', unit: 'cells/uL', referenceRangeMin: 4000, referenceRangeMax: 11000, criticalLow: 1500, criticalHigh: 30000, price: 4500, turnaroundHours: 4 },
  { code: 'LAB-PCV', name: 'Packed Cell Volume', category: 'Haematology', specimen: 'EDTA whole blood', method: 'Automated analyser', unit: '%', referenceRangeMin: 36, referenceRangeMax: 48, price: 1500, turnaroundHours: 2 },
  { code: 'LAB-HB', name: 'Haemoglobin', category: 'Haematology', specimen: 'EDTA whole blood', method: 'Cyanmethemoglobin', unit: 'g/dL', referenceRangeMin: 12, referenceRangeMax: 17, criticalLow: 7, criticalHigh: 22, price: 1500, turnaroundHours: 2 },
  { code: 'LAB-WBC', name: 'White Blood Cell Count', category: 'Haematology', specimen: 'EDTA whole blood', method: 'Flow cytometry', unit: 'cells/uL', referenceRangeMin: 4000, referenceRangeMax: 11000, criticalLow: 1000, criticalHigh: 30000, price: 1800, turnaroundHours: 3 },
  { code: 'LAB-PLATELET', name: 'Platelet Count', category: 'Haematology', specimen: 'EDTA whole blood', method: 'Automated analyser', unit: 'cells/uL', referenceRangeMin: 150000, referenceRangeMax: 450000, criticalLow: 50000, criticalHigh: 1000000, price: 1800, turnaroundHours: 3 },
  { code: 'LAB-MP', name: 'Malaria Parasite (Rapid)', category: 'Microbiology', specimen: 'EDTA whole blood', method: 'Rapid diagnostic test', unit: 'negative/positive', referenceRangeText: 'Negative', price: 2000, turnaroundHours: 1 },
  { code: 'LAB-MPSM', name: 'Malaria Parasite (Microscopy)', category: 'Microbiology', specimen: 'EDTA whole blood', method: 'Giemsa stained thick film', unit: 'parasites/uL', referenceRangeText: 'No parasite seen', price: 1200, turnaroundHours: 3 },
  { code: 'LAB-URINE', name: 'Urinalysis', category: 'Chemistry', specimen: 'Midstream urine', method: 'Dipstick', unit: 'negative/positive', referenceRangeText: 'Negative', price: 1500, turnaroundHours: 2 },
  { code: 'LAB-UECR', name: 'Urea, Electrolytes and Creatinine', category: 'Chemistry', specimen: 'Serum', method: 'Automated analyser', unit: 'mg/dL', referenceRangeMin: 15, referenceRangeMax: 50, criticalLow: 5, criticalHigh: 120, price: 5500, turnaroundHours: 4 },
  { code: 'LAB-FBS', name: 'Fasting Blood Sugar', category: 'Biochemistry', specimen: 'Serum', method: 'Glucose oxidase', unit: 'mg/dL', referenceRangeMin: 70, referenceRangeMax: 99, criticalLow: 50, criticalHigh: 400, price: 2000, turnaroundHours: 3, requiresFasting: true },
  { code: 'LAB-HBA1C', name: 'Glycated Haemoglobin', category: 'Biochemistry', specimen: 'EDTA whole blood', method: 'HPLC', unit: '%', referenceRangeMin: 4, referenceRangeMax: 5.6, price: 7500, turnaroundHours: 24 },
  { code: 'LAB-LFT', name: 'Liver Function Tests', category: 'Biochemistry', specimen: 'Serum', method: 'Automated analyser', unit: 'U/L', referenceRangeMin: 7, referenceRangeMax: 56, price: 6500, turnaroundHours: 6 },
  { code: 'LAB-KFT', name: 'Kidney Function Tests', category: 'Biochemistry', specimen: 'Serum', method: 'Automated analyser', unit: 'U/L', referenceRangeMin: 7, referenceRangeMax: 56, price: 6500, turnaroundHours: 6 },
  { code: 'LAB-LIPID', name: 'Lipid Profile', category: 'Biochemistry', specimen: 'Serum', method: 'Automated analyser', unit: 'mg/dL', referenceRangeMin: 0, referenceRangeMax: 200, price: 7000, turnaroundHours: 12, requiresFasting: true },
  { code: 'LAB-TSH', name: 'Thyroid Stimulating Hormone', category: 'Immunology', specimen: 'Serum', method: 'CLIA', unit: 'mIU/L', referenceRangeMin: 0.4, referenceRangeMax: 4.2, price: 9000, turnaroundHours: 24 },
  { code: 'LAB-HBSAG', name: 'Hepatitis B Surface Antigen', category: 'Serology', specimen: 'Serum', method: 'ELISA', unit: 'negative/positive', referenceRangeText: 'Negative', price: 4000, turnaroundHours: 24 },
  { code: 'LAB-HIV', name: 'HIV Screening (Rapid)', category: 'Serology', specimen: 'Whole blood', method: 'Rapid diagnostic test', unit: 'negative/positive', referenceRangeText: 'Non reactive', price: 3000, turnaroundHours: 1 },
  { code: 'LAB-VDRL', name: 'VDRL / RPR', category: 'Serology', specimen: 'Serum', method: 'Flocculation', unit: 'reactive/non-reactive', referenceRangeText: 'Non reactive', price: 2500, turnaroundHours: 6 },
  { code: 'LAB-BLOODGROUP', name: 'Blood Group and Genotype', category: 'Haematology', specimen: 'EDTA whole blood', method: 'Slide agglutination', unit: 'group', referenceRangeText: 'A positive', price: 1000, turnaroundHours: 1 },
  { code: 'LAB-CRP', name: 'C-Reactive Protein', category: 'Immunology', specimen: 'Serum', method: 'Immunoturbidimetry', unit: 'mg/L', referenceRangeMin: 0, referenceRangeMax: 6, price: 4500, turnaroundHours: 6 },
];

module.exports = {
  async up() {
    const { LaboratoryTest } = require('../models');

    for (const test of LABORATORY_TESTS) {
      // eslint-disable-next-line no-await-in-loop
      await LaboratoryTest.findOrCreate({
        where: { code: test.code },
        defaults: { ...test, isActive: true, requiresFasting: !!test.requiresFasting },
      });
    }

    console.log(`  laboratory tests: ${LABORATORY_TESTS.length}`);
  },

  async down() {
    const { LaboratoryTest } = require('../models');
    await LaboratoryTest.destroy({ where: {}, truncate: false });
  },
};

module.exports.LABORATORY_TESTS = LABORATORY_TESTS;
