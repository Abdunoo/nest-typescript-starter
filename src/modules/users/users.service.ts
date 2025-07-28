import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from '../database/database.module';
import { eq, like, desc, asc, count } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import * as schema from '../database/schema';
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

    return userWithRole;
  }

  async findAll(query: QueryUsersDto) {
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

      this.db
        .select({ count: count() })
        .from(users)
        .where(whereCondition)
        .then((result) => result[0].count),
    ]);

    return {
      data: usersList,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async findOne(id: number) {
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
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    // Check if user exists
    await this.findOne(id);

    const updateData: any = {
      ...updateUserDto,
      updatedAt: new Date(),
    };

    // Hash password if provided
    if (updateUserDto.password) {
      updateData.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    // Update role ID if provided
    if (updateUserDto.role) {
      updateData.roleId = ROLE_IDS[updateUserDto.role];
      delete updateData.role;
    }

    // Update user
    await this.db.update(users).set(updateData).where(eq(users.id, id));

    // Return updated user
    return this.findOne(id);
  }

  async remove(id: number) {
    // Check if user exists
    await this.findOne(id);

    // Delete user
    await this.db.delete(users).where(eq(users.id, id));

    return { message: 'User deleted successfully' };
  }
}
