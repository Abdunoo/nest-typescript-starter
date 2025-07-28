export enum Permission {
  // User permissions
  USER_CREATE = 'user:create',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',

  // Profile permissions
  PROFILE_READ = 'profile:read',
  PROFILE_UPDATE = 'profile:update',

  // Role permissions
  ROLE_CREATE = 'role:create',
  ROLE_READ = 'role:read',
  ROLE_UPDATE = 'role:update',
  ROLE_DELETE = 'role:delete',
}

// Define role permissions mapping
export const ROLE_PERMISSIONS = {
  admin: [
    Permission.USER_CREATE,
    Permission.USER_READ,
    Permission.USER_UPDATE,
    Permission.USER_DELETE,
    Permission.PROFILE_READ,
    Permission.PROFILE_UPDATE,
    Permission.ROLE_CREATE,
    Permission.ROLE_READ,
    Permission.ROLE_UPDATE,
    Permission.ROLE_DELETE,
  ],
  teacher: [
    Permission.USER_READ,
    Permission.PROFILE_READ,
    Permission.PROFILE_UPDATE,
  ],
} as const;
