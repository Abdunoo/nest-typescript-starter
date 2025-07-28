import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { Logger } from 'winston';
import { JwtService } from '@nestjs/jwt';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as bcrypt from 'bcrypt';
import * as schema from '../database/schema';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import { DATABASE_CONNECTION } from '../database/database.module';
import { ROLE_IDS, UserRole } from '@/modules/roles/roles.enum';

const { users, roles } = schema;

@Injectable()
export class AuthService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly jwtService: JwtService,
    @Inject('winston')
    private readonly logger: Logger,
  ) {}

  async register(registerDto: RegisterDto) {
    this.logger.info(
      `Attempting to register user with email: ${registerDto.email}`,
    );
    // Check if user already exists
    const existingUser = await this.db
      .select()
      .from(users)
      .where(eq(users.email, registerDto.email))
      .limit(1);

    if (existingUser.length > 0) {
      this.logger.warn(
        `Registration failed: Email already exists - ${registerDto.email}`,
      );
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

    const result = {
      user: userWithRole,
      access_token: token,
      message: 'Registration successful',
    };

    this.logger.info(`User registered successfully: ${userWithRole.email}`);
    return result;
  }

  async login(loginDto: LoginDto) {
    this.logger.info(`Login attempt for user: ${loginDto.email}`);
    this.logger.error('Login failed: User not found -', loginDto.email);
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
      this.logger.warn(`Login failed: User not found - ${loginDto.email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      this.logger.warn(
        `Login failed: Invalid password for user - ${loginDto.email}`,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      this.logger.warn(
        `Login failed: Account is deactivated - ${loginDto.email}`,
      );
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

    const result = {
      user: userWithoutPassword,
      access_token: token,
      message: 'Login successful',
    };

    this.logger.info(`User logged in successfully: ${user.email}`);
    return result;
  }

  async getProfile(userId: number) {
    this.logger.debug(`Fetching profile for user ID: ${userId}`);
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
      this.logger.warn(`Profile fetch failed: User not found - ID: ${userId}`);
      throw new UnauthorizedException('User not found');
    }

    this.logger.debug(`Profile fetched successfully for user ID: ${userId}`);
    return { user };
  }
}
