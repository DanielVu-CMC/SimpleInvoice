import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
export class LoginDto {
  @ApiProperty({ example: 'reviewer@example.com' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email: string;
  @ApiProperty({ format: 'password' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password: string;
}
export class UserProfileDto {
  @ApiPropertyOptional({
    description: 'JWT expiry in Unix milliseconds',
    type: Number,
  })
  tokenExpiresAt?: number;
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() email: string;
  @ApiProperty() fullname: string;
  @ApiProperty({ format: 'date-time' }) createdAt: Date;
}
export class LoginResponseDto {
  @ApiProperty({
    description:
      'JWT access token. The browser app uses the accompanying HttpOnly cookie instead of persisting this value.',
  })
  accessToken: string;
  @ApiProperty({ default: 3600 }) expiresIn: number;
  @ApiProperty({ type: UserProfileDto }) user: UserProfileDto;
}
