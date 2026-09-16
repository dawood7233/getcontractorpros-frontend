import { Component, HostListener } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ALL_SERVICES } from '../../data/services-data';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './header.html',
  styleUrls: ['./header.css']
})
export class Header {
  dropdownOpen = false;
  servicesOpen = false;
  isScrolled = false;
  services = ALL_SERVICES;

  toggleDropdown() {
    this.dropdownOpen = !this.dropdownOpen;
  }

  closeDropdown() {
    this.dropdownOpen = false;
    this.servicesOpen = false;
  }

  @HostListener('window:scroll', [])
  onScroll() {
    this.isScrolled = window.scrollY > 40;
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    const target = event.target as HTMLElement;
    const inside = target.closest('.menu-toggle') || target.closest('.nav') || target.closest('.services-menu');
    if (!inside) {
      this.dropdownOpen = false;
      this.servicesOpen = false;
    }
  }
}
