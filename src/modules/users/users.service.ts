import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
  HttpStatus,
} from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from '@/database/database.module';
import { aliasedTable, eq, sql } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import type { CreateUserDto } from './dto/create-user.dto';
import type { UpdateUserDto } from './dto/update-user.dto';
import { ROLE_IDS } from '../roles/roles.enum';
import { DbSchema, roles } from '@/database/schema';
import {
  users,
  User,
  UserWithRole,
  UserListItem,
} from '@/database/schema/users';
import { PaginationDto } from '@/common/types/pagination.dto';
import { PaginationResponse } from '@/common/types/pagination-response.type';
import { filterColumns, generateOrderBy } from '@/common/utils/filter-columns';

@Injectable()
export class UsersService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<DbSchema>,
  ) {}

  async create(createUserDto: CreateUserDto) {
    try {
      // Check if email already exists
      const existingUser = await this.db.query.users.findFirst({
        where: eq(users.email, createUserDto.email),
      });

      if (existingUser) {
        throw new ConflictException('Email already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

      // Get role ID
      const roleId = ROLE_IDS[createUserDto.role];
      if (!roleId) {
        throw new BadRequestException('Invalid role');
      }

      // Create user
      const [newUser] = await this.db
        .insert(users)
        .values({
          name: createUserDto.name,
          email: createUserDto.email,
          password: hashedPassword,
          roleId,
        })
        .returning();

      // Get user with role
      const userWithRole = await this.db.query.users.findFirst({
        where: eq(users.id, newUser.id),
        with: {
          role: true,
        },
      });

      if (!userWithRole) {
        throw new BadRequestException('Failed to create user');
      }

      return userWithRole;
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to create user');
    }
  }

  async findAll() {
    try {
      const users = await this.db.query.users.findMany({
        with: {
          role: true,
        },
      });

      return {
        statusCode: HttpStatus.OK,
        message: 'Berhasil mengambil daftar pengguna',
        data: users,
      };
    } catch (error) {
      throw new BadRequestException('Failed to fetch users');
    }
  }

  async findAllList(
    paginationDto: PaginationDto,
  ): Promise<PaginationResponse<UserListItem>> {
    try {
      const { page, perPage, filters, joinOperator, sort } = paginationDto;
      const offset = (page - 1) * perPage;

      // Aliased users for self-join as roles and warehouse
      const roleAlias = aliasedTable(roles, 'role');

      // Build where condition using filterColumns function
      const whereCondition = filterColumns({
        table: users,
        filters,
        joinOperator,
        joinTables: { role: roleAlias },
      });

      // Build order by using generateOrderBy function
      const orderBy = generateOrderBy({
        table: users,
        sort,
        joinTables: { role: roleAlias },
        defaultSortColumn: users.updatedAt,
      });

      // Get total count
      const totalCountResult = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .leftJoin(roleAlias, eq(roleAlias.id, users.roleId))
        .where(whereCondition);

      const totalRows = Number(totalCountResult[0]?.count ?? 0);

      // Get paginated results
      const rows = await this.db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          roleId: users.roleId,
          isActive: users.isActive,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          role: {
            id: roleAlias.id,
            name: roleAlias.name,
          },
        })
        .from(users)
        .leftJoin(roleAlias, eq(roleAlias.id, users.roleId))
        .where(whereCondition)
        .limit(perPage)
        .offset(offset)
        .orderBy(...orderBy);

      return {
        statusCode: HttpStatus.OK,
        message: 'Berhasil mengambil daftar pengguna',
        data: {
          rows,
          meta: {
            page,
            perPage,
            totalRows,
            totalPage: Math.ceil(totalRows / perPage),
          },
        },
      };
    } catch (error) {
      throw new BadRequestException('Failed to fetch list users');
    }
  }

  async findOne(id: number) {
    try {
      const user = await this.db.query.users.findFirst({
        where: eq(users.id, id),
        with: {
          role: true,
        },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      return user;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to fetch user');
    }
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    try {
      if (updateUserDto.email) {
        const userWithEmail = await this.db.query.users.findFirst({
          where: eq(users.email, updateUserDto.email),
        });

        if (userWithEmail && userWithEmail.id !== id) {
          throw new ConflictException('Email already exists');
        }
      }

      if (updateUserDto.role) {
        const roleId = ROLE_IDS[updateUserDto.role];
        if (!roleId) {
          throw new BadRequestException('Invalid role');
        }
      }

      const [updatedUser] = await this.db
        .update(users)
        .set({
          name: updateUserDto.name,
          email: updateUserDto.email,
          roleId: updateUserDto.role ? ROLE_IDS[updateUserDto.role] : undefined,
        })
        .where(eq(users.id, id))
        .returning();

      if (!updatedUser) {
        throw new BadRequestException('Failed to update user');
      }

      return updatedUser;
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to update user');
    }
  }

  async remove(id: number) {
    try {
      const user = await this.db.query.users.findFirst({
        where: eq(users.id, id),
        with: {
          role: true,
        },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      await this.db.delete(users).where(eq(users.id, id));

      return user;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to remove user');
    }
  }
}
