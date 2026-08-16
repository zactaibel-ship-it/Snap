export type VideoPlatform = 'youtube' | 'tiktok' | 'instagram';
export type CreatorPlatform = 'youtube' | 'tiktok';
export type SupermarketPreference = 'tesco' | 'sainsburys' | 'both';
export type MealType = 'breakfast' | 'lunch' | 'dinner';

export type Ingredient = {
  name: string;
  quantity: number | null;
  unit: string | null;
  aisle: string | null;
};

export type User = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  dietary_preferences: string[];
  supermarket_preference: SupermarketPreference;
  push_token: string | null;
  created_at: string;
};

export type Recipe = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  source_url: string;
  video_platform: VideoPlatform;
  thumbnail_url: string | null;
  ingredients: Ingredient[];
  steps: string[];
  servings: number;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  dietary_tags: string[];
  creator_name: string | null;
  rating: number | null;
  followed_creator_id: string | null;
  extracted_at: string;
  created_at: string;
};

export type MealPlan = {
  id: string;
  user_id: string;
  week_start_date: string;
  created_at: string;
};

export type MealPlanSlot = {
  id: string;
  meal_plan_id: string;
  day_of_week: number;
  meal_type: MealType;
  recipe_id: string;
};

export type ShoppingListItem = {
  id: string;
  user_id: string;
  ingredient_name: string;
  quantity: number | null;
  unit: string | null;
  aisle: string | null;
  checked: boolean;
  source_recipe_ids: string[];
  created_at: string;
};

export type FollowedCreator = {
  id: string;
  user_id: string;
  platform: CreatorPlatform;
  platform_creator_id: string;
  creator_name: string;
  creator_handle: string;
  avatar_url: string | null;
  auto_import: boolean;
  last_checked_at: string | null;
  created_at: string;
};

export type Database = {
  public: {
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, 'created_at' | 'push_token'> & { created_at?: string; push_token?: string | null };
        Update: Partial<Omit<User, 'id'>>;
        Relationships: [];
      };
      recipes: {
        Row: Recipe;
        Insert: Omit<Recipe, 'id' | 'created_at' | 'extracted_at' | 'rating' | 'followed_creator_id'> & {
          id?: string;
          created_at?: string;
          extracted_at?: string;
          rating?: number | null;
          followed_creator_id?: string | null;
        };
        Update: Partial<Omit<Recipe, 'id'>>;
        Relationships: [];
      };
      meal_plans: {
        Row: MealPlan;
        Insert: Omit<MealPlan, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<MealPlan, 'id'>>;
        Relationships: [];
      };
      meal_plan_slots: {
        Row: MealPlanSlot;
        Insert: Omit<MealPlanSlot, 'id'> & { id?: string };
        Update: Partial<Omit<MealPlanSlot, 'id'>>;
        Relationships: [];
      };
      shopping_list_items: {
        Row: ShoppingListItem;
        Insert: Omit<ShoppingListItem, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<ShoppingListItem, 'id'>>;
        Relationships: [];
      };
      followed_creators: {
        Row: FollowedCreator;
        Insert: Omit<FollowedCreator, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<FollowedCreator, 'id'>>;
        Relationships: [];
      };
    };
  };
};
