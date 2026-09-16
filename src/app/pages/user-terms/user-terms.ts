import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-user-terms',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './user-terms.html',
  styleUrl: './user-terms.css',
})
export class UserTerms {}
