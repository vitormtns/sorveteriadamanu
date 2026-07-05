import { LandingHeader } from "@/components/landing/landing-header";
import { HeroSection } from "@/components/landing/hero-section";
import { ProductHighlights } from "@/components/landing/product-highlights";
import { ExperienceSection } from "@/components/landing/experience-section";
import { ProductsSection } from "@/components/landing/products-section";
import { DeliverySection } from "@/components/landing/delivery-section";
import { PromoSection } from "@/components/landing/promo-section";
import { ContactSection } from "@/components/landing/contact-section";
import { LandingFooter } from "@/components/landing/landing-footer";

export default function LandingPage() {
  return <main className="landing-page"><LandingHeader /><HeroSection /><ProductHighlights /><ExperienceSection /><ProductsSection /><DeliverySection /><PromoSection /><ContactSection /><LandingFooter /></main>;
}
