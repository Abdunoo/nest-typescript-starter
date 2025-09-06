import { z } from 'zod';
import { createStudentSchema } from '../zod/student.schema';

export type CreateStudentDto = z.infer<typeof createStudentSchema>;
