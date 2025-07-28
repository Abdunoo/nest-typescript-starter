import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as bcrypt from 'bcrypt';
import * as schema from '../database/schema';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import { ROLE_IDS, UserRole } from '../roles/roles.enum';
import { DATABASE_CONNECTION } from '../database/database.module';

const { users, roles } = schema;

@Injectable()
export class AuthService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    // Check if user already exists
    const existingUser = await this.db
      .select()
      .from(users)
      .where(eq(users.email, registerDto.email))
      .limit(1);

    if (existingUser.length > 0) {
      throw new ConflictException('Email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Default role is teacher
    const roleId = ROLE_IDS[UserRole.TEACHER];

    // Create user
    const [newUser] = await this.db
      .insert(users)
      .values({
        name: registerDto.name,
        email: registerDto.email,
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
        role: roles.name,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.id, newUser.id));

    // Generate JWT token
    const payload = {
      sub: userWithRole.id,
      email: userWithRole.email,
      role: userWithRole.role,
    };

    const token = this.jwtService.sign(payload);

    return {
      user: userWithRole,
      access_token: token,
      message: 'Registration successful',
    };
  }

  async login(loginDto: LoginDto) {
    // Find user with role
    const [user] = await this.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        password: users.password,
        isActive: users.isActive,
        createdAt: users.createdAt,
        role: roles.name,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.email, loginDto.email))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Generate JWT token
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const token = this.jwtService.sign(payload);

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      access_token: token,
      message: 'Login successful',
    };
  }

  async getProfile(userId: number) {
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
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return { user };
  }
}
