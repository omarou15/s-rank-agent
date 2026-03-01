export type SkillCategory =
  | "development"
  | "data"
  | "content"
  | "devops"
  | "marketing"
  | "productivity"
  | "custom";

export type SkillSource = "official" | "community";

export interface Skill {
  id: string;
  name: string;
  slug: string;
  description: string;
  longDescription: string;
  category: SkillCategory;
  source: SkillSource;
  author: string;
  version: string;
  icon: string;
  installs: number;
  rating: number;
  ratingCount: number;
  systemPrompt: string;
  dependencies: SkillDependency[];
  requiredConnectors: string[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SkillDependency {
  name: string;
  type: "npm" | "pip" | "apt" | "system";
  version?: string;
}

export interface UserSkill {
  userId: string;
  skillId: string;
  installedAt: Date;
  active: boolean;
  config: Record<string, unknown>;
}

export interface SkillReview {
  id: string;
  skillId: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: Date;
}
