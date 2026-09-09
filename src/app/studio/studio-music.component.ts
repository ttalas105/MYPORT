import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { SliderModule } from 'primeng/slider';
import { type StudioAudioState } from './studio-audio';
import { STUDIO_SOUNDTRACK } from './studio-soundtrack';

/** Controls emit intent; StudioAudioService owns playback and persisted state. */
@Component({
  selector: 'app-studio-music',
  standalone: true,
  imports: [FormsModule, CheckboxModule, SliderModule],
  host: { 'data-studio-audio-control': '' },
  templateUrl: './studio-music.component.html',
  styleUrl: './studio-music.component.scss',
})
export class StudioMusicComponent {
  @Input() enabled = true;
  @Input() openness = 0;
  @Input() panelOpen = false;
  @Input() volume = 35;
  @Input() audioState: StudioAudioState = 'waiting';
  @Output() readonly enabledChanged = new EventEmitter<boolean>();
  @Output() readonly panelOpenChange = new EventEmitter<boolean>();
  @Output() readonly volumeChanged = new EventEmitter<number>();
  @Output() readonly resumeRequested = new EventEmitter<void>();

  readonly soundtrack = STUDIO_SOUNDTRACK;
}
