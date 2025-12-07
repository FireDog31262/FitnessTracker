import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { NewTraining } from "../new-training/new-training";
import { CurrentTraining } from "../current-training/current-training";
import { PastTraining } from '../past-training/past-training';
import { TrainingService } from '../training.service';
import { TrainingAnalyticsComponent } from '../training-analytics/training-analytics';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-training',
  imports: [MatTabsModule, NewTraining, CurrentTraining, PastTraining, TrainingAnalyticsComponent],
  templateUrl: './training.html',
  styleUrl: './training.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Training implements OnInit {
  protected readonly trainingService = inject(TrainingService);
  private readonly route = inject(ActivatedRoute);
  protected readonly ongoingTraining = this.trainingService.hasActiveTraining;
  protected selectedIndex = signal(0);

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        this.selectedIndex.set(Number(params['tab']));
      }
    });
  }
}
