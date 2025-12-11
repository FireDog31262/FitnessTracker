import { Injectable, inject, signal, computed } from '@angular/core';
import { Firestore, doc, setDoc, getDoc, updateDoc, increment } from '@angular/fire/firestore';
import { Store } from '@ngrx/store';
import * as fromRoot from '../../app.reducer';
import * as UI from '../../shared/ui.actions';
import { Achievement, AVAILABLE_ACHIEVEMENTS, UserGamificationStats, XP_PER_CALORIE, XP_PER_MINUTE, BASE_XP_LEVEL_UP } from './gamification.model';
import { Exercise } from '../training/excercise.model';

@Injectable({ providedIn: 'root' })
export class GamificationService {
  private firestore = inject(Firestore);
  private store = inject(Store<fromRoot.State>);
  private userSignal = this.store.selectSignal(fromRoot.getUser);

  private statsSignal = signal<UserGamificationStats | null>(null);
  readonly userStats = this.statsSignal.asReadonly();

  readonly unlockedAchievements = computed(() => {
    const stats = this.statsSignal();
    if (!stats) return [];
    return AVAILABLE_ACHIEVEMENTS.filter(a => stats.unlockedAchievements.includes(a.id));
  });

  readonly nextAchievements = computed(() => {
    const stats = this.statsSignal();
    if (!stats) return AVAILABLE_ACHIEVEMENTS;
    return AVAILABLE_ACHIEVEMENTS.filter(a => !stats.unlockedAchievements.includes(a.id));
  });

  async fetchUserStats() {
    const user = this.userSignal();
    if (!user) return;

    const docRef = doc(this.firestore, 'gamificationStats', user.id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as any;
      // Convert timestamp to Date if necessary
      if (data.lastWorkoutDate && data.lastWorkoutDate.toDate) {
        data.lastWorkoutDate = data.lastWorkoutDate.toDate();
      }
      this.statsSignal.set(data as UserGamificationStats);
    } else {
      // Initialize stats
      const initialStats: UserGamificationStats = {
        userId: user.id,
        level: 1,
        currentXP: 0,
        nextLevelXP: BASE_XP_LEVEL_UP,
        unlockedAchievements: [],
        streakDays: 0,
        totalCaloriesBurned: 0,
        totalWorkouts: 0
      };
      await setDoc(docRef, initialStats);
      this.statsSignal.set(initialStats);
    }
  }

  async processFinishedExercise(exercise: Exercise) {
    const user = this.userSignal();
    const stats = this.statsSignal();
    if (!user || !stats) return;

    // 1. Calculate XP
    let xpEarned = 0;
    if (exercise.Duration) {
      xpEarned += Math.round((exercise.Duration / 60) * XP_PER_MINUTE);
    }
    if (exercise.calories) {
      xpEarned += Math.round(exercise.calories * XP_PER_CALORIE);
    }
    // Bonus for resistance training (weight * reps / constant) - simplified for now
    if (exercise.type === 'resistance') {
        xpEarned += 50; // Flat bonus for now
    }

    // 2. Update Stats (XP, Level, Totals)
    let newCurrentXP = stats.currentXP + xpEarned;
    let newLevel = stats.level;
    let newNextLevelXP = stats.nextLevelXP;

    while (newCurrentXP >= newNextLevelXP) {
      newCurrentXP -= newNextLevelXP;
      newLevel++;
      newNextLevelXP = Math.round(newNextLevelXP * 1.2); // Increase difficulty by 20%
      this.store.dispatch(new UI.ShowSnackbar({
        message: `🎉 Level Up! You are now Level ${newLevel}!`,
        action: 'Awesome',
        duration: 5000
      }));
    }

    // 3. Update Streak
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let newStreak = stats.streakDays;
    let lastWorkout = stats.lastWorkoutDate ? new Date(stats.lastWorkoutDate) : null;

    if (lastWorkout) {
        lastWorkout.setHours(0,0,0,0);
        const diffTime = Math.abs(today.getTime() - lastWorkout.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            newStreak++;
        } else if (diffDays > 1) {
            newStreak = 1; // Reset streak
        }
        // If diffDays === 0 (same day), streak doesn't change
    } else {
        newStreak = 1;
    }

    const newTotalWorkouts = stats.totalWorkouts + 1;
    const newTotalCalories = stats.totalCaloriesBurned + (exercise.calories || 0);

    // 4. Check Achievements
    const newUnlockedAchievements = [...stats.unlockedAchievements];
    const newlyUnlocked: Achievement[] = [];

    AVAILABLE_ACHIEVEMENTS.forEach(achievement => {
      if (newUnlockedAchievements.includes(achievement.id)) return;

      let unlocked = false;
      switch (achievement.conditionType) {
        case 'count':
          if (newTotalWorkouts >= achievement.conditionValue) unlocked = true;
          break;
        case 'streak':
          if (newStreak >= achievement.conditionValue) unlocked = true;
          break;
        case 'calories':
          if (newTotalCalories >= achievement.conditionValue) unlocked = true;
          break;
        case 'early_bird':
            if (exercise.date) {
                const hour = exercise.date.getHours();
                if (hour < 8 && hour >= 4) unlocked = true; // Between 4 AM and 8 AM
            }
            break;
      }

      if (unlocked) {
        newUnlockedAchievements.push(achievement.id);
        newlyUnlocked.push(achievement);
      }
    });

    // 5. Save to Firestore
    const updatedStats: UserGamificationStats = {
      ...stats,
      level: newLevel,
      currentXP: newCurrentXP,
      nextLevelXP: newNextLevelXP,
      unlockedAchievements: newUnlockedAchievements,
      streakDays: newStreak,
      lastWorkoutDate: new Date(),
      totalCaloriesBurned: newTotalCalories,
      totalWorkouts: newTotalWorkouts
    };

    const docRef = doc(this.firestore, 'gamificationStats', user.id);
    await updateDoc(docRef, { ...updatedStats });
    this.statsSignal.set(updatedStats);

    // 6. Notify User
    if (xpEarned > 0) {
        this.store.dispatch(new UI.ShowSnackbar({
            message: `+${xpEarned} XP Earned!`,
            action: 'OK',
            duration: 3000
        }));
    }

    newlyUnlocked.forEach(ach => {
      this.store.dispatch(new UI.ShowSnackbar({
        message: `🏆 Achievement Unlocked: ${ach.title}!`,
        action: 'View',
        duration: 5000
      }));
    });
  }
}
