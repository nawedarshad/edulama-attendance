import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Delete,
  Query,
} from '@nestjs/common';
import {
  AnnouncementService,
  FrontendAnnouncement,
  AnnouncementsResponse,
  StatsResponse,
  TemplateResponse,
  AudienceOptionsResponse,
  ReceiptResponse,
} from './announcement.service';

// DTO classes with proper validation
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { AnnouncementPriority, AudienceType } from '@prisma/client';

class AudienceInputDto {
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

@Controller('announcements')
export class AnnouncementController {
  constructor(private readonly service: AnnouncementService) {}

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('audience') audience?: string,
    @Query('search') search?: string,
  ): Promise<AnnouncementsResponse> {
    return this.service.findAll({ status, priority, audience, search });
  }

  @Get('stats')
  getStats(): Promise<StatsResponse> {
    return this.service.getStats();
  }

  @Get('templates')
  getTemplates(): Promise<TemplateResponse[]> {
    return this.service.getTemplates();
  }

  @Get('audience-options')
  getAudienceOptions(): Promise<AudienceOptionsResponse> {
    return this.service.getAudienceOptions();
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<FrontendAnnouncement> {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateAnnouncementDto): Promise<FrontendAnnouncement> {
    return this.service.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAnnouncementDto,
  ): Promise<FrontendAnnouncement> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<{ success: boolean }> {
    return this.service.remove(id);
  }

  @Post('emergency')
  createEmergency(
    @Body() dto: CreateAnnouncementDto,
  ): Promise<FrontendAnnouncement> {
    return this.service.createEmergency(dto);
  }

  @Get(':id/receipts')
  getReceipts(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ReceiptResponse[]> {
    return this.service.getReceipts(id);
  }
}
