import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-api',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <div class="container">
        <h1>API Reference</h1>
        <p class="lead">Comprehensive API documentation coming soon...</p>
      </div>
    </div>
  `,
  styles: [`
    .page { padding: 4rem 0; min-height: calc(100vh - 200px); }
    .container { max-width: 1280px; margin: 0 auto; padding: 0 1.5rem; }
    h1 { font-size: 3rem; font-weight: 800; margin-bottom: 1rem; }
    .lead { font-size: 1.25rem; color: #6b7280; }
  `]
})
export class ApiComponent {}
