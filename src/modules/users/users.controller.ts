import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  ParseIntPipe,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Put,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '@/auth/jwt/jwt.guard';
import { PermissionsGuard } from '@/auth/guards/permissions.guard';
import { RequirePermissions } from '@/auth/decorators/permissions.decorator';
import type { CreateUserDto } from './dto/create-user.dto';
import type { UpdateUserDto } from './dto/update-user.dto';
import type { QueryUsersDto } from './dto/query-users.dto';
import { Permission } from '@/modules/permissions/permissions.enum';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @RequirePermissions(Permission.USER_CREATE)
  @HttpCode(HttpStatus.OK)
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @RequirePermissions(Permission.USER_READ)
  @HttpCode(HttpStatus.OK)
  async findAll(@Query() query: QueryUsersDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions(Permission.USER_READ)
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Put(':id')
  @RequirePermissions(Permission.USER_UPDATE)
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.USER_DELETE)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
