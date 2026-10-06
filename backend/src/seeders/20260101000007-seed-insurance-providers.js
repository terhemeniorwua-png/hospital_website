'use strict';

/** Seeds the insurance providers that claims can be raised against. */
const PROVIDERS = [
  { name: 'National Health Insurance Scheme', code: 'NHIS', contactPerson: 'Ibrahim Musa', phone: '+234 803 400 0001', email: 'claims@nhis.test', address: 'NHIS Head Office, Abuja' },
  { name: 'HealthCare Partners Nigeria', code: 'HCP', contactPerson: 'Folake Ade', phone: '+234 803 400 0002', email: 'claims@hcp.test', address: '22 Awolowo Avenue, Ikoyi' },
  { name: 'Lifetime Health Cover', code: 'LHC', contactPerson: 'Peter Obi', phone: '+234 803 400 0003', email: 'claims@lhc.test', address: '3 Ozumba Mbadiwe Avenue, Victoria Island' },
  { name: 'Crown Assure Insurance', code: 'CRN', contactPerson: 'Hauwa Yusuf', phone: '+234 803 400 0004', email: 'claims@crownassure.test', address: '9 Atiku Abubakar Avenue, Wuse' },
];

module.exports = {
  async up() {
    const { InsuranceProvider } = require('../models');

    for (const provider of PROVIDERS) {
      // eslint-disable-next-line no-await-in-loop
      await InsuranceProvider.findOrCreate({
        where: { code: provider.code },
        defaults: { ...provider, isActive: true },
      });
    }

    console.log(`  insurance providers: ${PROVIDERS.length}`);
  },

  async down() {
    const { InsuranceProvider } = require('../models');
    await InsuranceProvider.destroy({ where: {}, truncate: false });
  },
};

module.exports.PROVIDERS = PROVIDERS;
