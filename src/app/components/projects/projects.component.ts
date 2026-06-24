import { Component } from '@angular/core';
import { PROJECTS, Project } from '../../data/portfolio.data';

@Component({
  selector: 'app-projects',
  standalone: true,
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.scss',
})
export class ProjectsComponent {
  projects: Project[] = PROJECTS;
}
