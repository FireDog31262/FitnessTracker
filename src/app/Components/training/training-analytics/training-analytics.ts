import { Component, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { TrainingService } from '../training.service';
import { Exercise } from '../excercise.model';

@Component({
  selector: 'app-training-analytics',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './training-analytics.html',
  styleUrls: ['./training-analytics.less']
})
export class TrainingAnalyticsComponent implements OnInit {
  private trainingService = inject(TrainingService);

  ngOnInit() {
    this.trainingService.fetchFinishedExercises();
  }

  // Chart Configuration
  public barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    scales: {
      x: {},
      y: {
        min: 0,
        title: {
          display: true,
          text: 'Calories'
        }
      }
    },
    plugins: {
      legend: {
        display: true,
      },
      title: {
        display: true,
        text: 'Calories Burned per Week'
      }
    }
  };
  public barChartType: ChartType = 'bar';
  public barChartPlugins = [];

  // Computed data for the chart
  public barChartData = computed<ChartData<'bar'>>(() => {
    const exercises = this.trainingService.finishedExercises();
    const data = this.processData(exercises);

    return {
      labels: data.labels,
      datasets: [
        { data: data.calories, label: 'Calories Burned', backgroundColor: '#3f51b5' }
      ]
    };
  });

  private processData(exercises: Exercise[]) {
    const weeksMap = new Map<string, number>();

    exercises.forEach(ex => {
      if (ex.date && ex.state === 'completed') {
        // Handle Firestore Timestamp if necessary, though model says Date
        let date: Date;
        if (ex.date instanceof Date) {
            date = ex.date;
        } else if ((ex.date as any).toDate) {
            date = (ex.date as any).toDate();
        } else {
            date = new Date(ex.date);
        }

        const week = this.getWeekNumber(date);
        const year = date.getFullYear();
        const key = `Week ${week}, ${year}`;

        const calories = ex.calories || 0;
        weeksMap.set(key, (weeksMap.get(key) || 0) + calories);
      }
    });

    const sortedKeys = Array.from(weeksMap.keys()).sort((a, b) => {
        const [wA, yA] = this.parseWeekYear(a);
        const [wB, yB] = this.parseWeekYear(b);
        if (yA !== yB) return yA - yB;
        return wA - wB;
    });

    return {
      labels: sortedKeys,
      calories: sortedKeys.map(key => weeksMap.get(key) || 0)
    };
  }

  private getWeekNumber(d: Date): number {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
  }

  private parseWeekYear(label: string): [number, number] {
      const parts = label.split(', ');
      const week = parseInt(parts[0].replace('Week ', ''), 10);
      const year = parseInt(parts[1], 10);
      return [week, year];
  }
}
