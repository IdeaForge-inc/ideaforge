export interface GenerateParams {
  projectType: string;
  difficulty: string;
  teamSize: string;
  timeToComplete: string;
  domain: string;
  techStack: string[];
  customTech: string;
  language: string;
  customLanguage: string;
  extraRequirements: string;
}

export type SubmissionStatus = 'not_started' | 'in_progress' | 'done';

export interface Idea {
  id: number;
  userId: string;
  title: string;
  content: string;
  params: GenerateParams;
  isSaved: boolean;
  shareSlug: string | null;
  assignmentId: number | null;
  submissionStatus: SubmissionStatus;
  repoUrl: string;
  studentNote: string;
  grade: number | null;
  teacherFeedback: string;
  gradedAt: number | null;
  createdAt: number;
  author?: { username: string };
}

export type Role = 'student' | 'teacher';

export interface User {
  userId: string;
  login: string;
  username: string;
  role: Role;
  joinedAt: number;
}

export interface Profile extends User {
  totalIdeas: number;
  savedIdeas: number;
  favoriteTags: { tag: string; count: number }[];
  streak: number;
}

export interface Group {
  id: number;
  name: string;
  joinCode: string;
  teacherId?: string;
  teacherName?: string;
  createdAt: number;
  memberCount?: number;
  assignmentCount?: number;
}

export interface GroupMember {
  userId: string;
  username: string;
  joinedAt: number;
  ideaCount: number;
}

export interface Assignment {
  id: number;
  groupId: number;
  title: string;
  description: string;
  params: Partial<GenerateParams>;
  dueAt?: number | null;
  createdAt: number;
  submissionCount?: number;
  inProgressCount?: number;
  doneCount?: number;
  gradedCount?: number;
}
