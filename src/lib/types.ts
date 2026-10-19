export interface FoodEntry {
  id: string;
  name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  servings: number;
  loggedAt: string;
  meal?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  note?: string;
  barcode?: string;
  grams?: number;
  per100g?: boolean;
}

export interface DayLog {
  date: string;
  entries: FoodEntry[];
  isGymDay?: boolean;
}

export interface UserSettings {
  calorieGoal: number;
  proteinGoal?: number;
  carbsGoal?: number;
  fatGoal?: number;
  gymCalorieGoal?: number;
  gymProteinGoal?: number;
  gymCarbsGoal?: number;
  gymFatGoal?: number;
}

export interface EffectiveGoals {
  calorieGoal: number;
  proteinGoal?: number;
  carbsGoal?: number;
  fatGoal?: number;
}

export interface ParsedNutrition {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export interface FoodStat {
  id: string;
  name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  servings: number;
  useCount: number;
  lastUsedAt: string;
  pinned: boolean;
  barcode?: string;
  note?: string;
  grams?: number;
  per100g?: boolean;
}

export interface MealTemplate {
  id: string;
  name: string;
  entries: FoodEntry[];
}
