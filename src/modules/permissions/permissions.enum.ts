/**
 * Permission enum
 *
 * @enum {string}
 */
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

  // Student permissions
  STUDENT_CREATE = 'student:create',
  STUDENT_READ = 'student:read',
  STUDENT_UPDATE = 'student:update',
  STUDENT_DELETE = 'student:delete',
}

/**
 * Role permissions mapping
 *
 * @type {Object}
 */
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
    Permission.STUDENT_CREATE,
    Permission.STUDENT_READ,
    Permission.STUDENT_UPDATE,
    Permission.STUDENT_DELETE,
  ],
  teacher: [
    Permission.USER_READ,
    Permission.PROFILE_READ,
    Permission.PROFILE_UPDATE,
    Permission.STUDENT_READ,
  ],
} as const;
