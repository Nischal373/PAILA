export type PotholeSeverity = "low" | "medium" | "high" | "critical";
export type PotholeStatus = "reported" | "scheduled" | "in_progress" | "fixed";
export type VoteDirection = "up" | "down";
export type UserRole = "user" | "superadmin";

export interface SessionUser {
  username: string;
  role: UserRole;
  displayName?: string;
}

export interface Pothole {
  id: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  district?: string;
  municipality?: string;
  wardNumber?: string;
  ward?: string;
  department: string;
  severity: PotholeSeverity;
  potholeConfidence?: number;
  status: PotholeStatus;
  upvotes: number;
  downvotes: number;
  reporterName?: string;
  reportTime: string;
  fixedTime?: string;
  imageUrl?: string;
}

export interface NewPotholeInput {
  title: string;
  description?: string;
  latitude: number;
  longitude: number;
  department: string;
  severity: PotholeSeverity;
  potholeConfidence?: number;
  reporterName?: string;
  district?: string;
  municipality?: string;
  wardNumber?: string;
  ward?: string;
  imageUrl?: string;
}

export interface LeaderboardEntry {
  id: string;
  title: string;
  ward?: string;
  department: string;
  netVotes: number;
  status: PotholeStatus;
  openDurationHours: number;
}

export interface PotholeComment {
  id: string;
  potholeId: string;
  author?: string;
  body: string;
  createdAt: string;
}

export interface NewPotholeCommentInput {
  potholeId: string;
  author?: string;
  body: string;
}
