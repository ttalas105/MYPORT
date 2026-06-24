import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of, Observable } from 'rxjs';

const BASE = 'https://abacus.jasoncameron.dev';

@Injectable({ providedIn: 'root' })
export class ViewCounterService {
  private http = inject(HttpClient);

  hit(key: string): Observable<{ value: number } | null> {
    return this.http
      .get<{ value: number }>(`${BASE}/hit/thomas-talas-ca/${key}`)
      .pipe(catchError(() => of(null)));
  }
}
