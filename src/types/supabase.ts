
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface QuestionOption {
  id: string; 
  text: string;
}

export interface Question {
  id: string; 
  text: string;
  options: QuestionOption[];
  correctOptionId: string; 
}

export interface ProctorXTableType {
  user_id: string; 
  email: string; 
  pass: string;  
  name: string;  
  role: 'student' | 'teacher'; 
  avatar_url: string | null; 
  created_at?: string; 
}

export type ExamStatus = 'Published' | 'Ongoing' | 'Completed';

export type FlaggedEventType =
  | 'visibility_hidden'
  | 'visibility_visible'
  | 'fullscreen_entered'
  | 'fullscreen_exited'
  | 'blur'
  | 'focus'
  | 'copy_attempt'
  | 'paste_attempt'
  | 'shortcut_attempt'
  | 'dev_tools_detected'
  | 'webdriver_detected';

export interface FlaggedEvent {
  type: FlaggedEventType;
  timestamp: Date; 
  studentId: string; 
  examId: string; 
  details?: string;
}

// New SebEntryTokens Table Type
export interface SebEntryTokenTableType {
  token: string; // Primary Key
  student_user_id: string; // Foreign key to proctorX.user_id
  exam_id: string; // UUID, Foreign key to ExamX
  status: 'pending' | 'claimed' | 'expired';
  created_at: string;
  expires_at: string;
}

export interface Database {
  public: {
    Tables: {
      proctorX: {
        Row: ProctorXTableType;
        Insert: Omit<ProctorXTableType, 'created_at'>;
        Update: Partial<Omit<ProctorXTableType, 'created_at' | 'user_id' | 'email' | 'role'>>;
      };
      ExamX: {
        Row: {
          exam_id: string; 
          teacher_id: string; 
          title: string;
          description: string | null;
          duration: number; 
          allow_backtracking: boolean;
          questions: Question[] | null;
          exam_code: string; 
          status: ExamStatus;
          start_time: string | null; 
          end_time: string | null;   
          created_at: string;
          updated_at: string;
        };
        Insert: {
          exam_id?: string; 
          teacher_id: string;
          title: string;
          description?: string | null;
          duration: number;
          allow_backtracking?: boolean;
          questions?: Question[] | null;
          exam_code: string;
          status?: ExamStatus; 
          start_time: string | null; 
          end_time: string | null;   
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<{
          title: string;
          description: string | null;
          duration: number;
          allow_backtracking: boolean;
          questions: Question[] | null;
          status: ExamStatus;
          start_time: string | null;
          end_time: string | null;
          updated_at: string;
        }>;
      };
      ExamSubmissionsX: {
        Row: {
          submission_id: string; 
          exam_id: string; 
          student_user_id: string; 
          answers: Json | null; 
          status: 'In Progress' | 'Completed';
          score: number | null; 
          started_at: string;
          submitted_at: string | null;
          flagged_events: FlaggedEvent[] | null; 
        };
        Insert: {
          submission_id?: string;
          exam_id: string;
          student_user_id: string;
          answers?: Json | null;
          status?: 'In Progress' | 'Completed';
          score?: number | null;
          started_at?: string;
          submitted_at?: string | null;
          flagged_events?: FlaggedEvent[] | null;
        };
        Update: Partial<{
          answers: Json | null;
          status: 'In Progress' | 'Completed';
          score: number | null;
          submitted_at: string | null;
          flagged_events: FlaggedEvent[] | null;
        }>;
      };
      SebEntryTokens: { // Add SebEntryTokens table definition
        Row: SebEntryTokenTableType;
        Insert: SebEntryTokenTableType;
        Update: Partial<SebEntryTokenTableType>;
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

export type CustomUser = {
  user_id: string; 
  email: string;
  name: string | null;
  role: 'student' | 'teacher' | null;
  avatar_url: string | null;
};

export type ProctorXTable = Database['public']['Tables']['proctorX'];
export type Exam = Database['public']['Tables']['ExamX']['Row'];
export type ExamInsert = Database['public']['Tables']['ExamX']['Insert'];
export type ExamUpdate = Database['public']['Tables']['ExamX']['Update'];
export type ExamSubmission = Database['public']['Tables']['ExamSubmissionsX']['Row'];
export type ExamSubmissionInsert = Database['public']['Tables']['ExamSubmissionsX']['Insert'];
export type ExamSubmissionUpdate = Database['public']['Tables']['ExamSubmissionsX']['Update'];
export type SebEntryToken = Database['public']['Tables']['SebEntryTokens']['Row'];
export type SebEntryTokenInsert = Database['public']['Tables']['SebEntryTokens']['Insert'];
