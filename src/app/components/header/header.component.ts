import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-header',
  standalone: true,
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent implements OnInit {
  scrolled = signal(false);
  theme = inject(ThemeService);

  ngOnInit(): void {
    this.theme.init();
  }

  @HostListener('window:scroll')
  onScroll(): void {
    this.scrolled.set(window.scrollY > 32);
  }
}
