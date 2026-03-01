export interface Subject {
  id: string;
  name: string;
  code: string;
  branchId: string;
  semester: number;
  syllabus?: SyllabusUnit[];
  papers?: Paper[];
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
  createdAt?: string;
  updatedAt?: string;
}
