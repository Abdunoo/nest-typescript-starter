import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
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
import type { UpdateProfileDto } from './dto/update-profile.dto';
import { DATABASE_CONNECTION } from '../database/database.module';
import { ROLE_IDS, UserRole } from '@/modules/roles/roles.enum';
import { ConfigService } from '@nestjs/config';

const { users, roles, refreshTokens } = schema;

@Injectable()
export class AuthService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly jwtService: JwtService,
    @Inject('winston')
    private readonly logger: Logger,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    try {
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

      if (!userWithRole) {
        throw new BadRequestException('Failed to create user');
      }

      // Generate JWT token
      const payload = {
        sub: userWithRole.id,
        email: userWithRole.email,
        role: userWithRole.role,
      };

      const [accessToken, refreshToken] = await Promise.all([
        this.generateAccessToken(payload),
        this.generateRefreshToken(payload.sub),
      ]);

      const result = {
        user: userWithRole,
        access_token: accessToken,
        refresh_token: refreshToken,
        message: 'Registration successful',
      };
      return result;
    } catch (error) {
      this.logger.error(`Registration failed: ${error.message}`);
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Registration failed');
    }
  }

  async login(loginDto: LoginDto) {
    try {
      this.logger.info(`Login attempt for user: ${loginDto.email}`);
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

      const [accessToken, refreshToken] = await Promise.all([
        this.generateAccessToken(payload),
        this.generateRefreshToken(payload.sub),
      ]);

      // Remove password from response
      const { password, ...userWithoutPassword } = user;

      const result = {
        user: userWithoutPassword,
        access_token: accessToken,
        refresh_token: refreshToken,
        message: 'Login successful',
      };

      this.logger.info(`User logged in successfully: ${user.email}`);
      return result;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException('Login failed');
    }
  }

  private async generateAccessToken(payload: {
    sub: number;
    email: string;
    role: string;
  }) {
    try {
      return this.jwtService.sign(payload, {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: this.configService.get('JWT_EXPIRES_IN'),
      });
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException('Failed to generate access token');
    }
  }

  private async generateRefreshToken(userId: number) {
    try {
      const expiresIn = this.configService.get<string>(
        'JWT_REFRESH_EXPIRES_IN',
      );
      const refreshToken = this.jwtService.sign(
        { sub: userId },
        {
          secret: this.configService.get('JWT_REFRESH_SECRET'),
          expiresIn,
        },
      );

      const expiresInNumber = parseInt(
        this.configService.get<string>('JWT_REFRESH_EXPIRES_IN'),
      );
      const expiresAt = new Date();
      expiresAt.setTime(expiresAt.getTime() + expiresInNumber);

      await this.db.insert(refreshTokens).values({
        token: refreshToken,
        userId,
        expiresAt,
      });

      return refreshToken;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException('Failed to generate refresh token');
    }
  }

  async refreshToken(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      const storedToken = await this.db
        .select()
        .from(refreshTokens)
        .where(eq(refreshTokens.token, token))
        .limit(1);

      if (!storedToken.length) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const [userWithRole] = await this.db
        .select({
          id: users.id,
          email: users.email,
          role: roles.name,
        })
        .from(users)
        .innerJoin(roles, eq(users.roleId, roles.id))
        .where(eq(users.id, payload.sub));

      if (!userWithRole) {
        throw new UnauthorizedException('User not found');
      }

      // Delete old refresh token
      await this.db.delete(refreshTokens).where(eq(refreshTokens.token, token));

      // Generate new tokens
      const newPayload = {
        sub: userWithRole.id,
        email: userWithRole.email,
        role: userWithRole.role,
      };

      const [accessToken, refreshToken] = await Promise.all([
        this.generateAccessToken(newPayload),
        this.generateRefreshToken(userWithRole.id),
      ]);

      return {
        access_token: accessToken,
        refresh_token: refreshToken,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException('Failed to refresh token');
    }
  }

  async getProfile(userId: number) {
    try {
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
        this.logger.warn(
          `Profile fetch failed: User not found - ID: ${userId}`,
        );
        throw new UnauthorizedException('User not found');
      }

      this.logger.debug(`Profile fetched successfully for user ID: ${userId}`);
      return { user };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException('Failed to fetch profile');
    }
  }

  async updateProfile(userId: number, updateProfileDto: UpdateProfileDto) {
    try {
      this.logger.debug(`Updating profile for user ID: ${userId}`);

      // Get current user with password
      const [currentUser] = await this.db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!currentUser) {
        this.logger.warn(
          `Profile update failed: User not found - ID: ${userId}`,
        );
        throw new UnauthorizedException('User not found');
      }

      // Check if email is being changed and if it's already taken
      if (
        updateProfileDto.email &&
        updateProfileDto.email !== currentUser.email
      ) {
        const existingUser = await this.db
          .select()
          .from(users)
          .where(eq(users.email, updateProfileDto.email))
          .limit(1);

        if (existingUser.length > 0) {
          throw new ConflictException('Email already exists');
        }
      }

      // Verify current password if changing password
      if (updateProfileDto.currentPassword) {
        const isPasswordValid = await bcrypt.compare(
          updateProfileDto.currentPassword,
          currentUser.password,
        );

        if (!isPasswordValid) {
          throw new BadRequestException('Current password is incorrect');
        }
      }

      // Prepare update data
      const updateData: any = {};
      if (updateProfileDto.name) updateData.name = updateProfileDto.name;
      if (updateProfileDto.email) updateData.email = updateProfileDto.email;
      if (updateProfileDto.newPassword) {
        updateData.password = await bcrypt.hash(
          updateProfileDto.newPassword,
          10,
        );
      }

      // Update user
      await this.db.update(users).set(updateData).where(eq(users.id, userId));

      this.logger.debug(`Profile updated successfully for user ID: ${userId}`);
      return this.getProfile(userId);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException('Failed to update profile');
    }
  }
}
