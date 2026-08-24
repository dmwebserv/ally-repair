export interface FoodEntry {
  id: string;
  name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  servings: number;
  loggedAt: string;
}

export interface DayLog {
  date: string;
  entries: FoodEntry[];
}

export interface UserSettings {
  calorieGoal: number;
}

export interface ParsedNutrition {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}
