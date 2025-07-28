import {
  Controller,
  Post,
  Body,
  Get,
  Put,
  Request,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
} from './zod/auth.schema';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { RequirePermissions } from '@/auth/decorators/permissions.decorator';
import { Permission } from '@/modules/permissions/permissions.enum';
import { JwtAuthGuard } from '@/auth/jwt/jwt.guard';
import { PermissionsGuard } from './guards/permissions.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.OK)
  async register(
    @Body(new ZodValidationPipe(registerSchema)) registerDto: RegisterDto,
  ) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body(new ZodValidationPipe(loginSchema)) loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body('refresh_token') token: string) {
    return this.authService.refreshToken(token);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.PROFILE_READ)
  @HttpCode(HttpStatus.OK)
  async getProfile(@Request() req) {
    return this.authService.getProfile(req.user.userId);
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.PROFILE_UPDATE)
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @Request() req,
    @Body(new ZodValidationPipe(updateProfileSchema))
    updateProfileDto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(req.user.userId, updateProfileDto);
  }
}
