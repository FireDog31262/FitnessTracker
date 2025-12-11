export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  conditionType: 'streak' | 'calories' | 'count' | 'early_bird';
  conditionValue: number;
}

export interface UserGamificationStats {
  userId: string;
  level: number;
  currentXP: number;
  nextLevelXP: number;
  unlockedAchievements: string[]; // Array of Achievement IDs
  streakDays: number;
  lastWorkoutDate?: Date;
  totalCaloriesBurned: number;
  totalWorkouts: number;
}

export const AVAILABLE_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_workout',
    title: 'First Step',
    description: 'Completed your first workout!',
    icon: 'fitness_center',
    conditionType: 'count',
    conditionValue: 1
  },
  {
    id: 'streak_3',
    title: 'On Fire',
    description: '3-day workout streak!',
    icon: 'local_fire_department',
    conditionType: 'streak',
    conditionValue: 3
  },
  {
    id: 'streak_7',
    title: 'Unstoppable',
    description: '7-day workout streak!',
    icon: 'whatshot',
    conditionType: 'streak',
    conditionValue: 7
  },
  {
    id: 'calories_1000',
    title: 'Burner',
    description: 'Burned 1000 total calories',
    icon: 'bolt',
    conditionType: 'calories',
    conditionValue: 1000
  },
  {
    id: 'early_bird',
    title: 'Early Bird',
    description: 'Completed a workout before 8 AM',
    icon: 'wb_sunny',
    conditionType: 'early_bird',
    conditionValue: 1
  }
];

export const XP_PER_MINUTE = 10;
export const XP_PER_CALORIE = 0.5;
export const BASE_XP_LEVEL_UP = 1000;
