import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MARKETING_PARTNERS } from '../../data/partners-data';

@Component({
  selector: 'app-partner-companies',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './partner-companies.html',
  styleUrl: './partner-companies.css',
})
export class PartnerCompanies {
  query = '';
  partners = MARKETING_PARTNERS;

  get filtered(): string[] {
    const q = this.query.trim().toLowerCase();
    if (!q) return this.partners;
    return this.partners.filter((p) => p.toLowerCase().includes(q));
  }
}
