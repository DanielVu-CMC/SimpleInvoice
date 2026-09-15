import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { compare, hashSync } from 'bcryptjs';
import { randomBytes } from 'crypto';
import { UserEntity } from '../users/user.entity';
import { LoginDto, UserProfileDto } from './auth.dto';
@Injectable()
export class AuthService {
  // Dummy hash to prevent timing attacks
  private readonly dummyHash = hashSync(randomBytes(32).toString('hex'), 12);
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}
  async login(dto: LoginDto) {
    const user = await this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email: dto.email })
      .getOne();
    const valid = await compare(
      dto.password,
      user?.passwordHash ?? this.dummyHash,
    );
    if (!user || !valid)
      throw new UnauthorizedException('Invalid email or password');
    const accessToken = await this.jwt.signAsync({ sub: user.id });
    return {
      accessToken,
      expiresIn: this.config.getOrThrow<number>('JWT_EXPIRES_IN'),
      user: {
        ...this.profile(user),
        tokenExpiresAt:
          this.jwt.decode<{ exp: number }>(accessToken).exp * 1000,
      },
    };
  }
  profile(user: UserEntity): UserProfileDto {
    return {
      id: user.id,
      email: user.email,
      fullname: user.fullname,
      createdAt: user.createdAt,
    };
  }
}
