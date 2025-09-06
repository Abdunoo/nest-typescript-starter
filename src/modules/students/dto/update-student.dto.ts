import { z } from 'zod';
import { updateStudentSchema } from '../zod/student.schema';

export type UpdateStudentDto = z.infer<typeof updateStudentSchema>;
