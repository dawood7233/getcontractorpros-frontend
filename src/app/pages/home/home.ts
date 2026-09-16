import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ALL_SERVICES } from '../../data/services-data';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  services = ALL_SERVICES;
  featured = ALL_SERVICES.filter((s) =>
    ['Roofing', 'Windows', 'HVAC', 'Solar', 'Plumbing', 'Kitchen'].includes(s.title)
  );
  areaCards = ALL_SERVICES.slice(0, 3);
  openFaq: number | null = 0;
  heroIndex = 0;
  readonly heroImages = ['assets/images/banner-sm.webp', 'assets/images/banner-2-sm.webp'];

  get heroSrc(): string {
    return this.heroImages[this.heroIndex];
  }

  faqs = [
    {
      q: 'What home improvement services can I request?',
      a: 'GetContractorPros matches homeowners with local professionals for roofing, windows, HVAC, solar, plumbing, kitchen and bathroom remodeling, gutters, siding, flooring, fencing, painting, home security, and moving.',
    },
    {
      q: 'Is this service free for homeowners?',
      a: 'Yes. Filling out a quote request is free. Independent contractors may contact you with estimates. Always verify license and insurance before hiring.',
    },
    {
      q: 'How quickly will I hear from a contractor?',
      a: 'Most homeowners hear from one or more local providers shortly after submitting a complete request. Timing varies by zip code and project type.',
    },
    {
      q: 'Do you perform the work yourselves?',
      a: 'No. We are a matching platform. All contractors listed through our network are independent businesses. You choose who to hire.',
    },
    {
      q: 'What areas do you cover?',
      a: 'We connect homeowners with contractors across the United States. Availability depends on the service type and your location.',
    },
  ];

  steps = [
    { n: '01', title: 'Tell us your project', text: 'Choose a service and answer a few questions about scope, timeline, and property.' },
    { n: '02', title: 'We match local pros', text: 'Your request is shared with independent contractors who serve your area.' },
    { n: '03', title: 'Compare quotes', text: 'Review options, ask questions, and hire the professional that fits your budget.' },
    { n: '04', title: 'Get the job done', text: 'Move forward with a vetted local contractor and complete your home project.' },
  ];

  testimonials = [
    { name: 'Esther Howard', role: 'Homeowner, Texas', quote: 'We compared three roofing quotes in days instead of weeks of calling around. The process was simple and professional.' },
    { name: 'Tynisha Obey', role: 'Homeowner, Ohio', quote: 'Windows replacement used to feel overwhelming. GetContractorPros made it easy to describe the job and hear from local installers.' },
    { name: 'Brittni Lando', role: 'Homeowner, Florida', quote: 'Needed HVAC help before summer. Fast matching, clear next steps, and a contractor who understood our system.' },
  ];

  toggleFaq(i: number) {
    this.openFaq = this.openFaq === i ? null : i;
  }

  nextHero() {
    this.heroIndex = (this.heroIndex + 1) % 2;
  }

  prevHero() {
    this.heroIndex = (this.heroIndex + 1) % 2;
  }
}
