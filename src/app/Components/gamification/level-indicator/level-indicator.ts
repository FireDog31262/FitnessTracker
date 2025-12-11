import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { GamificationService } from '../gamification.service';

@Component({
  selector: 'app-level-indicator',
  standalone: true,
  imports: [CommonModule, MatProgressBarModule],
  templateUrl: './level-indicator.html',
  styleUrls: ['./level-indicator.less']
})
export class LevelIndicatorComponent {
  private gamificationService = inject(GamificationService);

  stats = this.gamificationService.userStats;

  progress = computed(() => {
    const s = this.stats();
    if (!s) return 0;
    return (s.currentXP / s.nextLevelXP) * 100;
  });
}
