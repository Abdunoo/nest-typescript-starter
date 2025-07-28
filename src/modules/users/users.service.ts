import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from '@/database/database.module';
import { eq, like, desc, asc, count } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import * as schema from '@/database/schema';
import type { CreateUserDto } from './dto/create-user.dto';
import type { UpdateUserDto } from './dto/update-user.dto';
import type { QueryUsersDto } from './dto/query-users.dto';
import { ROLE_IDS } from '../roles/roles.enum';

const { users, roles } = schema;

@Injectable()
export class UsersService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
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
      const [userWithRole] = await this.db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          isActive: users.isActive,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          role: roles.name,
        })
        .from(users)
        .innerJoin(roles, eq(users.roleId, roles.id))
        .where(eq(users.id, newUser.id));

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

  async findAll(query: QueryUsersDto) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = query;
      const offset = (page - 1) * limit;

      let whereCondition;
      if (search) {
        whereCondition = like(users.name, `%${search}%`);
      }

      const orderBy =
        sortOrder === 'asc' ? asc(users[sortBy]) : desc(users[sortBy]);

      const [usersList, totalCount] = await Promise.all([
        this.db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            isActive: users.isActive,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
            role: roles.name,
          })
          .from(users)
          .innerJoin(roles, eq(users.roleId, roles.id))
          .where(whereCondition)
          .orderBy(orderBy)
          .limit(limit)
          .offset(offset),

        this.db.select({ count: count() }).from(users).where(whereCondition),
      ]);

      return {
        data: usersList,
        meta: {
          total: Number(totalCount[0].count),
          page,
          limit,
        },
      };
    } catch (error) {
      throw new BadRequestException('Failed to fetch users');
    }
  }

  async findOne(id: number) {
    try {
      const [user] = await this.db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          isActive: users.isActive,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          role: roles.name,
        })
        .from(users)
        .innerJoin(roles, eq(users.roleId, roles.id))
        .where(eq(users.id, id));

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
      const existingUser = await this.findOne(id);

      if (updateUserDto.email) {
        const userWithEmail = await this.db
          .select()
          .from(users)
          .where(eq(users.email, updateUserDto.email))
          .limit(1);

        if (userWithEmail.length > 0 && userWithEmail[0].id !== id) {
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

      return this.findOne(id);
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
      const user = await this.findOne(id);

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
