/**
 * Editorial site content.
 *
 * These are real institutional facts about the hospital (profile, departments,
 * facilities, service lines, resources, accreditations). They are deliberately
 * separated from anything the backend owns: live data - doctors, medicines,
 * availability, appointments, records, billing - is always fetched from the
 * API and never hard-coded here.
 */

export const hospital = {
  name: 'St. Aurelia Teaching Hospital',
  shortName: 'St. Aurelia',
  tagline: 'Compassionate care, taught and practised in Lagos.',
  established: 1974,
  beds: 320,
  teachingAffiliations: ['Lagos University Teaching Hospital', 'West African College of Medicine'],
  accreditations: [
    { name: 'National Hospital Accreditation Board', detail: 'Fully accredited general hospital' },
    { name: 'Medical and Dental Council of Nigeria', detail: 'Registered clinical facility' },
    { name: 'ISO 9001:2015', detail: 'Quality management certified' },
  ],
  about: [
    'St. Aurelia Teaching Hospital is a 320-bed public teaching hospital on the Victoria Island waterfront, serving Lagos State and neighbouring states since 1974. We combine specialist outpatient clinics, a 24-hour emergency department, a full diagnostic laboratory and imaging suite, an inpatient ward block and a hospital pharmacy under one roof.',
    'As a teaching hospital, every resident we train works directly in our clinics alongside consultant staff. That means a patient referred here is seen by someone who supervises trainees today and may be a consultant here tomorrow.',
    'We publish our appointment availability, laboratory turnaround targets and pharmacy pricing openly, because we believe patients should be able to plan their care before they arrive.',
  ],
  mission:
    'To deliver safe, evidence-based, affordable healthcare to everyone who needs it, and to train the next generation of clinicians to do the same.',
  vision:
    'A West Africa where quality hospital care is the default rather than the exception.',
  values: [
    { title: 'Safety before speed', description: 'Every clinical handover is structured, verified and documented.' },
    { title: 'Explain the fee', description: 'You should know what a consultation or investigation costs before you consent.' },
    { title: 'Teach as we treat', description: 'Residents and students learn on our patients, so care is always supervised.' },
    { title: 'Treat the whole person', description: 'Chronic disease follow-up, counselling and pharmacy support are part of the visit.' },
  ],
};

export const departments = [
  {
    slug: 'internal-medicine',
    name: 'Internal Medicine',
    icon: 'stethoscope',
    blurb: 'Adult medical care for diabetes, hypertension, asthma, kidney and liver disease.',
    detail:
      'Our internal medicine consultants run the largest chronic-disease clinic in the hospital, with structured follow-up for over four thousand patients on long-term therapy.',
    leadName: 'Dr Grace Eze',
    specialties: ['Diabetes & endocrinology', 'Hypertension', 'Respiratory medicine', 'Nephrology', 'Gastroenterology'],
    location: 'Block C, Level 2',
  },
  {
    slug: 'orthopaedics',
    name: 'Orthopaedics & Trauma',
    icon: 'bed',
    blurb: 'Fracture care, joint surgery, rehabilitation and physiotherapy.',
    detail:
      'A 24-hour trauma service with an on-call orthopaedic team, plus elective joint surgery and an in-house physiotherapy gym.',
    leadName: 'Dr Tunde Balogun',
    specialties: ['Fracture management', 'Joint replacement', 'Spine', 'Sports injury', 'Physiotherapy'],
    location: 'Block A, Level 1',
  },
  {
    slug: 'obstetrics-gynaecology',
    name: 'Obstetrics & Gynaecology',
    icon: 'heart-pulse',
    blurb: 'Antenatal care, delivery, postnatal follow-up and women’s health.',
    detail:
      'With a dedicated labour ward, neonatal resuscitation team and a family-planning clinic operating six days a week.',
    leadName: 'Dr Amara Nwosu',
    specialties: ['Antenatal care', 'Delivery', 'Postnatal care', 'Gynaecological surgery', 'Family planning'],
    location: 'Block D, Level 1',
  },
  {
    slug: 'paediatrics',
    name: 'Paediatrics',
    icon: 'heart',
    blurb: 'Child health, immunisation, growth monitoring and paediatric emergencies.',
    detail:
      'A child-friendly wing with isolation capability, immunisation services and a feeding and nutrition clinic.',
    leadName: 'Dr Ifeoma Obi',
    specialties: ['Immunisation', 'Growth & nutrition', 'Neonatal care', 'Paediatric asthma', 'Malnutrition'],
    location: 'Block D, Level 2',
  },
  {
    slug: 'laboratory',
    name: 'Laboratory Services',
    icon: 'flask',
    blurb: 'Haematology, chemistry, microbiology, serology and blood banking.',
    detail:
      'Routine results are typically released within four hours; urgent samples are flagged critical and phoned through to the ordering clinician.',
    leadName: 'Dr Samuel Adeyemi',
    specialties: ['Haematology', 'Clinical chemistry', 'Microbiology', 'Histopathology', 'Blood bank'],
    location: 'Block B, Ground floor',
  },
  {
    slug: 'radiology',
    name: 'Radiology & Imaging',
    icon: 'scan',
    blurb: 'Digital X-ray, ultrasound, CT and MRI with online reporting.',
    detail:
      'Studies are reported by consultant radiologists, and reports appear in your portal as soon as they are signed.',
    leadName: 'Dr Zainab Yusuf',
    specialties: ['Digital radiography', 'Obstetric ultrasound', 'CT', 'MRI', 'Mammography'],
    location: 'Block B, Level 1',
  },
  {
    slug: 'pharmacy',
    name: 'Hospital Pharmacy',
    icon: 'pill',
    blurb: 'Dispensing, medication counselling and chronic refills.',
    detail:
      'Every medicine dispensed is verified against the prescription by a pharmacist before it leaves the counter. Retail prices are published in our pharmacy catalogue.',
    leadName: 'Dr Kelechi Uche',
    specialties: ['Dispensing', 'Clinical review', 'Antibiotic stewardship', 'Patient counselling'],
    location: 'Block A, Ground floor',
  },
  {
    slug: 'emergency',
    name: 'Emergency Department',
    icon: 'ambulance',
    blurb: '24-hour triage, resuscitation, trauma and acute medical care.',
    detail:
      'A five-tier triage system with a dedicated resuscitation bay, open around the clock, staffed by emergency physicians and trauma nurses.',
    leadName: 'Dr Bisi Afolayan',
    specialties: ['Triage', 'Resuscitation', 'Trauma', 'Acute cardiac', 'Poisoning'],
    location: 'Ground floor, West entrance',
  },
];

export const services = [
  { icon: 'stethoscope', title: 'Specialist consultations', description: 'Book a named consultant in internal medicine, orthopaedics, obstetrics, paediatrics or general practice.' },
  { icon: 'video', title: 'Telemedicine reviews', description: 'Discuss an existing diagnosis, review results and adjust treatment with a consultant by video or phone.' },
  { icon: 'flask', title: 'Diagnostics & laboratory', description: 'Bloods, microbiology, pathology and a same-day service for urgent investigations.' },
  { icon: 'scan', title: 'Imaging', description: 'Digital X-ray, ultrasound, CT and MRI with consultant radiology reporting.' },
  { icon: 'pill', title: 'Pharmacy', description: 'Prescription dispensing, medicines catalogue, advice and chronic refills.' },
  { icon: 'clipboard', title: 'Nursing & wound care', description: 'Dressings, injections, vital signs and scheduled clinical administrations.' },
  { icon: 'bed', title: 'Inpatient admission', description: 'Elective and emergency admissions with consultant ward rounds daily.' },
  { icon: 'ambulance', title: 'Emergency & ambulance', description: '24-hour emergency department with triage and stabilisation.' },
];

export const facilities = [
  { title: '320 beds', description: 'Including a 24-bed critical care unit and a dedicated isolation ward.' },
  { title: '6 operating theatres', description: 'Two dedicated obstetric theatres running alongside general surgery.' },
  { title: 'Digital imaging suite', description: 'CT, MRI and a fully digital radiography department.' },
  { title: '24/7 blood bank', description: 'Cross-matching and transfusion support for emergencies and surgery.' },
  { title: 'Teaching centre', description: 'Lecture theatres and skills labs for the resident training programme.' },
  { title: 'Hospital pharmacy', description: 'Stocking over a hundred generic preparations with transparent pricing.' },
];

export const telemedicine = {
  image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1400&q=80',
  title: 'Telemedicine & follow-up',
  description:
    'Some of your care does not need a waiting room. Telemedicine reviews are booked as a consultation with your usual doctor, and results can be discussed before you come in for a repeat prescription.',
  points: [
    'Book a review the same way as any other appointment — the clinic will confirm the channel.',
    'Bring your questions; reviews are scheduled for twenty minutes, not five.',
    'Prescriptions issued during a review are sent straight to the hospital pharmacy.',
  ],
  note: 'Video and telephone reviews are arranged by the clinic — book the appointment and the team will contact you with your secure link.',
};

export const emergencyGuide = {
  title: 'Emergency care, 24 hours a day',
  intro:
    'Our emergency department never closes. If you are experiencing a medical emergency, come to the West entrance or call the emergency line below. Do not wait for an appointment.',
  redFlags: [
    { title: 'Chest pain or pressure', description: 'Especially with sweating, nausea or pain spreading to the arm, jaw or back.' },
    { title: 'Difficulty breathing', description: 'Stridor, blue lips, or breathlessness at rest.' },
    { title: 'Sudden weakness or numbness', description: 'Face droop, slurred speech or one-sided weakness — stroke warning signs.' },
    { title: 'Uncontrolled bleeding', description: 'Bleeding that will not stop with firm pressure.' },
    { title: 'Loss of consciousness or a seizure', description: 'Or any seizure lasting more than five minutes.' },
    { title: 'Severe allergic reaction', description: 'Swelling of the face or throat, difficulty breathing, widespread rash.' },
    { title: 'Major trauma or burns', description: 'Road traffic collision, fall from height, or extensive burns.' },
    { title: 'Suspected poisoning or overdose', description: 'Including ingestion of household chemicals or excess medication.' },
  ],
  onArrival: [
    'Bring identification and any medicines you are currently taking, in their original packaging.',
    'A triage nurse will assess you immediately and assign a priority level from one to five.',
    'Critical patients are moved straight to the resuscitation bay; minor cases are streamed to a fast-track lane.',
    'Bring a relative or friend if you can — we will need a history and current medication details.',
  ],
};

export const whyChooseUs = [
  { icon: 'users', title: 'Named consultants', description: 'You book a specific doctor, not a slot that could be filled by anyone.' },
  { icon: 'shield', title: 'Supervised teaching', description: 'Residents and students work under consultant supervision on every ward round.' },
  { icon: 'wallet', title: 'Published prices', description: 'Consultation fees and medicine prices are shown before you book.' },
  { icon: 'activity', title: 'Published turnaround', description: 'Routine laboratory results are targeted within four hours.' },
  { icon: 'file', title: 'One record', description: 'Notes, results, imaging and prescriptions live together in your portal.' },
  { icon: 'chat', title: 'Direct messaging', description: 'Message your care team between visits for non-urgent questions.' },
];

export const testimonials = [
  {
    quote:
      'I booked a cardiology follow-up from my phone on a Sunday evening, saw the fee before I confirmed, and the consultant had my blood results in front of her when I walked in. That should not be remarkable.',
    name: 'Chioma O.',
    detail: 'Patient since 2021 · Internal medicine',
  },
  {
    quote:
      'My son was admitted at 2am. The triage nurse explained what was happening in plain language, and a doctor updated us every few hours. We never felt like we were being processed rather than treated.',
    name: 'Ade B.',
    detail: 'Parent · Paediatrics',
  },
  {
    quote:
      'I manage three chronic conditions and have never once been asked to repeat a test I had done last month. The pharmacy already had my refills ready because my results were in the system.',
    name: 'Fatima S.',
    detail: 'Patient since 2019 · Diabetes clinic',
  },
];

export const resources = [
  { icon: 'file', title: 'Consent and your rights', description: 'What we may and may not do without your consent, and how to raise a concern.' },
  { icon: 'wallet', title: 'Fees and payment', description: 'How consultation fees, investigations and inpatient bills are calculated.' },
  { icon: 'pill', title: 'Using your medicines', description: 'Dosing, missed doses, storage and what to do about side effects.' },
  { icon: 'clipboard', title: 'Preparing for a scan', description: 'What to expect from X-ray, ultrasound, CT and MRI, and how to prepare.' },
  { icon: 'chat', title: 'Getting your results', description: 'When results appear in your portal and who to contact with questions.' },
  { icon: 'ambulance', title: 'When to call an ambulance', description: 'Red flags that should not wait for a clinic appointment.' },
];

export const faqs = [
  {
    question: 'How do I book an appointment?',
    answer:
      'Create an account, choose a department, pick a named doctor and an available slot from the step-by-step booking flow. You will see the consultation fee before you confirm, and you receive a confirmation you can open from your dashboard.',
  },
  {
    question: 'Can I browse doctors and medicines without an account?',
    answer:
      'Yes — our directory pages are open to everyone, and your basket and appointment choices are kept on this device. Signing in is only needed when you want to save a booking, view your records, or check out a pharmacy basket.',
  },
  {
    question: 'What does a consultation cost?',
    answer:
      'Each doctor publishes their consultation fee in their profile. Additional charges — investigations, imaging, procedures or medicines — are itemised on your invoice and visible in your billing section before payment.',
  },
  {
    question: 'How do I pay?',
    answer:
      'Invoices can be settled at the hospital billing office by card, cash or bank transfer. Any insurance claim is submitted on your behalf and tracked in your billing section.',
  },
  {
    question: 'Can I cancel or reschedule?',
    answer:
      'Yes. Open the appointment from your dashboard and choose cancel or reschedule. Rescheduling selects a new free slot from the same doctor’s calendar.',
  },
  {
    question: 'How do I get a prescription filled?',
    answer:
      'Prescriptions issued in clinic appear in your records section. Verified prescriptions can be dispensed by the hospital pharmacy, and non-prescription medicines from our catalogue can be added to a basket and sent to the pharmacy counter.',
  },
  {
    question: 'Do you provide emergency care?',
    answer:
      'Yes, 24 hours a day. Walk in through the West entrance or call the emergency line. Please do not book an appointment for an emergency.',
  },
];

export const gallery = [
  { src: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&q=80', alt: 'Bright hospital reception with seating and plants', caption: 'Main reception' },
  { src: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=1200&q=80', alt: 'Doctor consulting with a patient in a clinic room', caption: 'Outpatient clinic' },
  { src: 'https://images.unsplash.com/photo-1512678080530-7760d81faba6?auto=format&fit=crop&w=1200&q=80', alt: 'Modern hospital corridor with natural light', caption: 'Main corridor' },
  { src: 'https://images.unsplash.com/photo-1581595219315-a187dd40c322?auto=format&fit=crop&w=1200&q=80', alt: 'Laboratory scientist handling samples', caption: 'Laboratory' },
  { src: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=1200&q=80', alt: 'Radiographer reviewing a scan on screen', caption: 'Imaging suite' },
  { src: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80', alt: 'Pharmacist organising medication shelves', caption: 'Hospital pharmacy' },
  { src: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1600&q=80', alt: 'Hospital ward with beds prepared for patients', caption: 'Inpatient ward' },
  { src: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=1200&q=80', alt: 'Emergency department entrance with ambulance bay', caption: 'Emergency entrance' },
];

export const heroImages = {
  primary: 'https://images.unsplash.com/photo-1584982751601-97dcc096659c?auto=format&fit=crop&w=2000&q=85',
  secondary: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1200&q=85',
};

export function departmentBySlug(slug) {
  return departments.find((department) => department.slug === slug) || null;
}

export function departmentByName(name) {
  if (!name) return null;
  return departments.find((department) => department.name.toLowerCase() === String(name).toLowerCase()) || null;
}
