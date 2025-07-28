export enum UserRole {
  ADMIN = 'admin',
  TEACHER = 'teacher',
}

export const ROLE_IDS = {
  [UserRole.ADMIN]: 1,
  [UserRole.TEACHER]: 2,
} as const;
