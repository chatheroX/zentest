
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ==== New Table Structures ====

export interface Admin {
  id: string; // UUID
  username: string;
  password_hash: string; // Hashed password
  created_at: string; // TIMESTAMPTZ
}

export interface LicenseKey {
  id: string; // UUID
  key_value: string; // The actual license key string
  is_claimed: boolean;
  claimed_at: string | null; // TIMESTAMPTZ
  claimed_by_user_id: string | null; // UUID, Foreign Key to users table
  created_by_admin_id: string; // UUID, Foreign Key to admins table
  created_at: string; // TIMESTAMPTZ
}

export interface User {
  id: string; // UUID
  username: string;
  password_hash: string; // Hashed password
  saved_links: string[] | null; // Array of URLs
  license_key_used_id: string; // UUID, Foreign Key to license_keys table
  created_at: string; // TIMESTAMPTZ
}

// ==== Supabase Database Definition ====
export interface Database {
  public: {
    Tables: {
      admins: {
        Row: Admin;
        Insert: Omit<Admin, 'id' | 'created_at'>;
        Update: Partial<Omit<Admin, 'id' | 'created_at'>>;
      };
      license_keys: {
        Row: LicenseKey;
        Insert: Omit<LicenseKey, 'id' | 'created_at' | 'is_claimed' | 'claimed_at' | 'claimed_by_user_id'> & {
          created_by_admin_id: string; // Ensure this is provided on insert
          key_value: string;
        };
        Update: Partial<Omit<LicenseKey, 'id' | 'created_at' | 'created_by_admin_id' | 'key_value'>>;
      };
      users: {
        Row: User;
        Insert: Omit<User, 'id' | 'created_at'> & {
           license_key_used_id: string; // Ensure this is provided
        };
        Update: Partial<Omit<User, 'id' | 'created_at' | 'license_key_used_id' | 'username'>>; // Username typically not updatable this way
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// ==== Custom User Type for AuthContext (Simplified) ====
// This will represent the authenticated user in the application context.
// It might be a 'user' or an 'admin'.
export interface AuthenticatedUser {
  id: string;
  username: string;
  role: 'user' | 'admin'; // Differentiates between regular user and admin
  avatar_url?: string | null; // Generic avatar, can be based on username/role
  saved_links?: string[] | null; // Only applicable if role is 'user'
}

// Specific table type exports if needed elsewhere directly
export type AdminTableType = Database['public']['Tables']['admins'];
export type LicenseKeyTableType = Database['public']['Tables']['license_keys'];
export type UserTableType = Database['public']['Tables']['users'];
