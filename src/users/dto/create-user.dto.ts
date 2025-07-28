import { z } from 'zod';
import { UserRole } from '../../roles/roles.enum';

export const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.nativeEnum(UserRole),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;
