import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  API_USAGE_NOTES,
  EDITOR_COMPONENT,
  SERVICES,
  TABLE_OPTIONS_COMPONENT,
  TOOLBAR_COMMANDS,
  TOOLBAR_COMPONENT,
  TYPE_DEFINITIONS,
} from './api.data';

@Component({
  selector: 'app-api',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './api.component.html',
  styleUrl: './api.component.css',
})
export class ApiComponent {
  readonly editorComponent = EDITOR_COMPONENT;
  readonly toolbarComponent = TOOLBAR_COMPONENT;
  readonly tableOptionsComponent = TABLE_OPTIONS_COMPONENT;
  readonly toolbarCommands = TOOLBAR_COMMANDS;
  readonly services = SERVICES;
  readonly types = TYPE_DEFINITIONS;
  readonly usageNotes = API_USAGE_NOTES;
}
