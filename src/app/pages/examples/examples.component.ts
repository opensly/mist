import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { EXAMPLES } from './examples.data';

@Component({
  selector: 'app-examples',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './examples.component.html',
  styleUrl: './examples.component.css',
})
export class ExamplesComponent {
  readonly examples = EXAMPLES;
}
