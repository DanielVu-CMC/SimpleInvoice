import { ExtractJwt, Strategy } from 'passport-jwt';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { isUUID } from 'class-validator';
import { UserEntity } from '../../users/user.entity';
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request: Request) =>
          (request.cookies as Record<string, string> | undefined)
            ?.access_token ?? null,
      ]),
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
      algorithms: ['HS256'],
      issuer: 'simpleinvoice',
      audience: 'simpleinvoice-web',
    });
  }
  async validate(payload: { sub?: unknown; exp?: unknown }) {
    if (
      typeof payload.sub !== 'string' ||
      !isUUID(payload.sub) ||
      typeof payload.exp !== 'number' ||
      !Number.isFinite(payload.exp)
    )
      throw new UnauthorizedException();
    const user = await this.users.findOneBy({ id: payload.sub });
    if (!user) throw new UnauthorizedException();
    return { ...user, tokenExpiresAt: payload.exp * 1000 };
  }
}
