import { Component } from '@angular/core';
import { ROLES, Role } from '../../data/portfolio.data';

@Component({
  selector: 'app-work',
  standalone: true,
  templateUrl: './work.component.html',
  styleUrl: './work.component.scss',
})
export class WorkComponent {
  roles: Role[] = ROLES;
}
