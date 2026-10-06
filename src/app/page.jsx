import Hero from '../components/home/Hero';
import FindDoctorSection from '../components/home/FindDoctorSection';
import PharmacySection from '../components/home/PharmacySection';
import {
  CtaSection,
  DepartmentsSection,
  EmergencySection,
  FacilitiesSection,
  GallerySection,
  LaboratorySection,
  ServicesSection,
  TelemedicineSection,
  TestimonialsSection,
  WhyChooseUsSection,
} from '../components/home/sections';

export default function HomePage() {
  return (
    <>
      <Hero />
      <ServicesSection />
      <FindDoctorSection />
      <TelemedicineSection />
      <DepartmentsSection />
      <LaboratorySection />
      <PharmacySection />
      <EmergencySection />
      <FacilitiesSection />
      <WhyChooseUsSection />
      <GallerySection />
      <TestimonialsSection />
      <CtaSection />
    </>
  );
}
