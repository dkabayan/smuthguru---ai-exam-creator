export enum CognitiveLevel {
  L1 = "L1 (Pengetahuan & Pemahaman)",
  L2 = "L2 (Aplikasi)",
  L3 = "L3 (Penalaran)"
}

export interface ExamConfig {
  subject: string;
  grade: string;
  materialText: string;
  materialFile?: {
    data: string; // Base64 string
    mimeType: string;
    name: string;
  };
  topic: string;
  countL1: number;
  countL2: number;
  countL3: number;
  countEssay: number; 
  isHotsMode?: boolean;
}

export interface BlueprintItem {
  id: number;
  basicCompetency: string;
  material: string;
  indicator: string;
  level: "L1" | "L2" | "L3";
  questionForm: "Pilihan Ganda" | "Uraian";
  questionNumber: number;
}

export interface QuestionItem {
  blueprintId: number;
  questionText: string;
  options?: string[]; // For Multiple Choice
  correctAnswer: string; // For Essay: Rubric/Main Answer
  explanation: string;
}

export type AppStep = 'config' | 'blueprint' | 'cards' | 'exam';