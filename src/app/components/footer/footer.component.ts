import { Component, OnInit, inject, signal } from '@angular/core';
import { ViewCounterService } from '../../services/view-counter.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
})
export class FooterComponent implements OnInit {
  year = new Date().getFullYear();
  views = signal<number | null>(null);

  private counter = inject(ViewCounterService);

  ngOnInit(): void {
    this.counter.hit('visits').subscribe((res) => {
      if (res) this.views.set(res.value);
    });
  }
}
