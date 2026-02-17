
export interface SupportText {
  id: string;
  title: string;
  content: string;
  icon: string;
}

export interface Topic {
  id: string;
  title: string;
  supportTexts: SupportText[];
}

export interface CompetencyScore {
  name: string;
  score: number;
  feedback: string;
}

export interface CorrectionResult {
  totalScore: number;
  competencies: CompetencyScore[];
  generalComment: string;
  timeTaken?: string;
  topicTitle?: string;
  aiDetected: boolean;
  aiJustification?: string;
}

export type EssayInput = 
  | { type: 'text'; content: string }
  | { type: 'image'; base64: string; mimeType: string };

export interface SavedEssay {
  id: string;
  tema: string;
  conteudo: string;
  score: number;
  data_envio: string;
  result?: CorrectionResult;
  student_name?: string;
  student_id?: string;
  class_id?: string;
  school_id?: string;
  status?: string;
}

export interface Assignment {
  id: string;
  title: string;
  class_id: string;
  due_date: string;
  created_at: string;
}

export interface RankUser {
  id: string;
  name: string;
  avatar: string;
  points: number;
  essaysCount: number;
  school: string;
  school_id?: string;
  className: string;
  class_id?: string;
  isCurrentUser?: boolean;
  trend: 'up' | 'down' | 'neutral';
}

export interface Notification {
  id: string;
  type: 'correction' | 'ranking' | 'system' | 'tip' | 'assignment';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface School {
  id: string;
  name: string;
  city: string;
}

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  photoUrl: string;
  school: string;
  school_id?: string;
  class_id?: string;
  user_type: 'student' | 'teacher' | 'school_admin';
}

export interface StudentDetail {
  id: string;
  name: string;
  email: string;
  averageScore: number;
  essaysSubmitted: number;
  lastActivity: string;
  status: 'active' | 'risk' | 'inactive';
  class_id?: string;
  school_id?: string;
  birth_date?: string;
  registration_number?: string;
}

export interface ClassGroup {
  id: string;
  name: string;
  grade: string;
  shift: 'Matutino' | 'Vespertino' | 'Noturno' | 'Integral';
  studentCount: number;
  averageScore: number;
  school_id: string;
  trend: 'up' | 'down' | 'neutral';
}

export interface BulkStudentRow {
  name: string;
  email: string;
  birth_date: string;
  class_name: string;
  registration_number: string;
}
