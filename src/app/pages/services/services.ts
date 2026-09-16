import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ALL_SERVICES } from '../../data/services-data';

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './services.html',
  styleUrl: './services.css',
})
export class Services {
  services = ALL_SERVICES;
}
