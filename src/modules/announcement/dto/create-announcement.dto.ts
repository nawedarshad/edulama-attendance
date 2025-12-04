import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { AnnouncementPriority, AudienceType } from '@prisma/client';

export class AudienceInputDto {
  @IsEnum(AudienceType)
  type: AudienceType;

  @IsArray()
  @IsOptional()
  ids: number[] = [];

  @IsOptional()
  @IsArray()
  names?: string[];
}

export class CreateAnnouncementDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsEnum(AnnouncementPriority)
  priority?: AnnouncementPriority;

  @IsOptional()
  @IsString()
  @IsEnum(['DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'EXPIRED', 'SCHEDULED'])
  status?: 'DRAFT' | 'PENDING_APPROVAL' | 'ACTIVE' | 'EXPIRED' | 'SCHEDULED';

  @IsOptional()
  @IsArray()
  audience?: AudienceInputDto[];

  @IsOptional()
  @IsString()
  scheduledFor?: string;

  @IsOptional()
  @IsString()
  expiresAt?: string;

  @IsOptional()
  @IsBoolean()
  isEmergency?: boolean;
}

export class UpdateAnnouncementDto extends CreateAnnouncementDto {}
