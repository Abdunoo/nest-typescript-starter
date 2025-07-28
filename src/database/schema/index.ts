import { roles } from './roles';
import { users, usersRelations } from './users';
import { refreshTokens } from './refresh-tokens';

// Re-export everything for external use
export * from './roles';
export * from './users';
export * from './refresh-tokens';

// Schema for tables and relations
export const dbSchema = {
  users,
  roles,
  refreshTokens,
  usersRelations,
};

export type DbSchema = typeof dbSchema;
