import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-unsubscribe',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './unsubscribe.html',
  styleUrl: './unsubscribe.css',
})
export class Unsubscribe {
  domainName = 'GetContractorPros';
  email = '';
  errorVisible = false;
  confirmationMessage = '';
  confirmationVisible = false;
  isSubmitting = false;

  isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  async handleUnsubscribe(e: Event): Promise<void> {
    e.preventDefault();
    const trimmed = this.email.trim();
    if (!this.isValidEmail(trimmed)) {
      this.errorVisible = true;
      return;
    }
    this.errorVisible = false;
    this.isSubmitting = true;
    this.confirmationVisible = false;
    try {
      const apiBase =
        window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
          ? 'http://localhost:3018'
          : window.location.origin;

      const response = await fetch(`${apiBase}/server/unsubscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, url: window.location.href }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error('Unsubscribe failed');
      }
      this.confirmationMessage = `If ${trimmed} exists in our records, this email will no longer receive marketing emails, calls, or messages.`;
      this.confirmationVisible = true;
      this.email = '';
    } catch {
      this.errorVisible = true;
      this.confirmationVisible = false;
    } finally {
      this.isSubmitting = false;
    }
  }
}
