import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { GamificationService } from '../gamification.service';

@Component({
  selector: 'app-achievements',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatTooltipModule],
  templateUrl: './achievements.html',
  styleUrls: ['./achievements.less']
})
export class AchievementsComponent {
  private gamificationService = inject(GamificationService);

  unlockedAchievements = this.gamificationService.unlockedAchievements;
  nextAchievements = this.gamificationService.nextAchievements;
}
