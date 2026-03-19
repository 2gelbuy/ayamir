import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Database {
  public: {
    Tables: {
      tasks: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          start_time: string | null;
          is_focused: boolean;
          is_completed: boolean;
          created_at: string;
          completed_at: string | null;
          snoozed_until: string | null;
          notified_at_10: boolean;
          notified_at_5: boolean;
          notified_at_0: boolean;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          start_time?: string | null;
          is_focused?: boolean;
          is_completed?: boolean;
          created_at?: string;
          completed_at?: string | null;
          snoozed_until?: string | null;
          notified_at_10?: boolean;
          notified_at_5?: boolean;
          notified_at_0?: boolean;
        };
        Update: {
          title?: string;
          start_time?: string | null;
          is_focused?: boolean;
          is_completed?: boolean;
          completed_at?: string | null;
          snoozed_until?: string | null;
          notified_at_10?: boolean;
          notified_at_5?: boolean;
          notified_at_0?: boolean;
        };
      };
      user_settings: {
        Row: {
          id: string;
          user_id: string;
          humor_tone: 'polite' | 'default' | 'sarcastic';
          nudge_mode: 'soft' | 'hard';
          sound_enabled: boolean;
          volume: number;
          blacklist: string[];
          whitelist: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          humor_tone?: 'polite' | 'default' | 'sarcastic';
          nudge_mode?: 'soft' | 'hard';
          sound_enabled?: boolean;
          volume?: number;
          blacklist?: string[];
          whitelist?: string[];
        };
        Update: {
          humor_tone?: 'polite' | 'default' | 'sarcastic';
          nudge_mode?: 'soft' | 'hard';
          sound_enabled?: boolean;
          volume?: number;
          blacklist?: string[];
          whitelist?: string[];
        };
      };
    };
  };
}
