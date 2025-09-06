import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  ParseIntPipe,
  Body,
  HttpCode,
  HttpStatus,
  Put,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { StudentsService } from './students.service';
import { JwtAuthGuard } from '@/auth/jwt/jwt.guard';
import { PermissionsGuard } from '@/auth/guards/permissions.guard';
import { RequirePermissions } from '@/auth/decorators/permissions.decorator';
import { Permission } from '@/modules/permissions/permissions.enum';
import type { CreateStudentDto } from './dto/create-student.dto';
import type { UpdateStudentDto } from './dto/update-student.dto';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { createStudentSchema, updateStudentSchema } from './zod/student.schema';
import { PaginationDto } from '@/common/types/pagination.dto';
import { CsrfGuard } from '@/auth/guards/csrf.guard';

@Controller('students')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  @RequirePermissions(Permission.STUDENT_CREATE)
  @UseGuards(CsrfGuard)
  @HttpCode(HttpStatus.OK)
  async create(
    @Body(new ZodValidationPipe(createStudentSchema)) dto: CreateStudentDto,
  ) {
    return this.studentsService.create(dto);
  }

  @Get()
  @RequirePermissions(Permission.STUDENT_READ)
  @HttpCode(HttpStatus.OK)
  async findAll() {
    return this.studentsService.findAll();
  }

  @Post('list')
  @RequirePermissions(Permission.STUDENT_READ)
  @HttpCode(HttpStatus.OK)
  async list(@Body() paginationDto: PaginationDto) {
    return this.studentsService.list(paginationDto);
  }

  @Get('export')
  @RequirePermissions(Permission.STUDENT_READ)
  @HttpCode(HttpStatus.OK)
  async export(@Res() res: Response) {
    const csv = await this.studentsService.exportCsv({
      page: 1,
      perPage: 100000,
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="students.csv"');
    return res.send(csv);
  }

  @Get(':id')
  @RequirePermissions(Permission.STUDENT_READ)
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.studentsService.findOne(id);
  }

  @Put(':id')
  @RequirePermissions(Permission.STUDENT_UPDATE)
  @UseGuards(CsrfGuard)
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(updateStudentSchema)) dto: UpdateStudentDto,
  ) {
    return this.studentsService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.STUDENT_DELETE)
  @UseGuards(CsrfGuard)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.studentsService.remove(id);
  }
}
