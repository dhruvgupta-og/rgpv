export interface Subject {
  id: string;
  name: string;
  code: string;
  branchId: string;
  semester: number;
  syllabus?: SyllabusUnit[];
  papers?: Paper[];
  videos?: Video[];
  createdAt?: string;
  updatedAt?: string;
}

export interface SyllabusUnit {
  id: number;
  subjectId: string;
  unitNumber: number;
  title: string;
  topics: string[];
}

export interface Paper {
  id: number;
  subjectId: string;
  year: string;
  month: string;
  examType: string;
  pdfPath?: string | null;
  views?: number;
  createdAt?: string;
}

export interface Video {
  id: number;
  subjectId: string;
  title: string;
  url: string;
  createdAt?: string;
}

export interface PyqAnalytics {
  subjectId: string;
  units?: {
    unit: string;
    percentage?: number;
    topics?: string[];
    repeated?: string[];
    trend?: { year: string; count: number }[];
  }[];
  updatedAt?: string;
  createdAt?: string;
}

export interface Branch {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  color: string;
  createdAt?: string;
}

export interface Profile {
  id: number;
  deviceId: string;
  name: string;
  branchId: string;
  year: string;
  collegeName: string;
  email: string;
  firebaseUid?: string | null;
  createdAt?: string;
  updatedAt?: string;
}
