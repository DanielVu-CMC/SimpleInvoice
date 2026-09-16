import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CookieOptions, Request, Response } from 'express';
import { ErrorDto } from '../common/error.dto';
import { UserEntity } from '../users/user.entity';
import { AuthService } from './auth.service';
import { LoginDto, LoginResponseDto, UserProfileDto } from './auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
@ApiForbiddenResponse({ type: ErrorDto })
@ApiInternalServerErrorResponse({ type: ErrorDto })
@ApiTags('Authentication')
@ApiBadRequestResponse({ type: ErrorDto })
@ApiTooManyRequestsResponse({ type: ErrorDto })
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}
  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.config.getOrThrow<string>('COOKIE_SECURE') === 'true',
      sameSite: 'strict',
      path: '/',
    };
  }
  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Authenticate and issue a JWT (also set in an HttpOnly cookie)',
  })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorDto })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.login(dto);
    response.locals.authUserId = result.user.id;
    response.setHeader('Cache-Control', 'no-store');
    response.cookie('access_token', result.accessToken, {
      ...this.cookieOptions(),
      maxAge: result.expiresIn * 1000,
    });
    return result;
  }
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Get current authenticated profile' })
  @ApiOkResponse({ type: UserProfileDto })
  @ApiUnauthorizedResponse({ type: ErrorDto })
  me(
    @Req() request: Request & { user: UserEntity & { tokenExpiresAt: number } },
  ) {
    return {
      ...this.auth.profile(request.user),
      tokenExpiresAt: request.user.tokenExpiresAt,
    };
  }
  @Post('logout')
  @HttpCode(204)
  @ApiOperation({ summary: 'Clear the browser session cookie' })
  @ApiNoContentResponse()
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('access_token', this.cookieOptions());
  }
}
