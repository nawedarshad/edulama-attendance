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
  UseGuards,
  Req,
  BadRequestException,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadedFile } from '@nestjs/common';

import {
  AnnouncementService,
  FrontendAnnouncement,
  AnnouncementsResponse,
  StatsResponse,
  TemplateResponse,
  AudienceOptionsResponse,
  ReceiptResponse,
} from './announcement.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/auth.decorator';
import type { AuthUser } from '../auth/auth.service'; // Changed to import type
import { Public } from '../auth/auth.decorator';

// DTO classes with proper validation
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

export class EmergencyAnnouncementDto {
  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  template?: string;
}

@Controller('announcements')
@UseGuards(AuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
export class AnnouncementController {
  constructor(private readonly service: AnnouncementService) {}

  @Get()
  async findAll(
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('audience') audience?: string,
    @Query('search') search?: string,
    @CurrentUser() user?: AuthUser,
  ): Promise<AnnouncementsResponse> {
    console.log(
      `Fetching announcements for user: ${user?.email} (ID: ${user?.id})`,
    );
    return this.service.findAll(
      { status, priority, audience, search },
      user?.id,
    );
  }

  @Get('stats')
  async getStats(@CurrentUser() user?: AuthUser): Promise<StatsResponse> {
    console.log(`Fetching stats for user: ${user?.email} (ID: ${user?.id})`);
    return this.service.getStats(user?.id);
  }
  @Get('me')
  getMe(@CurrentUser() user: AuthUser) {
    return user;
  }

  @Get('test-auth')
  @Public() // Make this public to test
  async testAuth(@Req() req: any) {
    console.log('=== TEST AUTH ENDPOINT ===');
    console.log('Headers:', req.headers);
    console.log('Authorization:', req.headers.authorization);

    return {
      headers: req.headers,
      hasAuthHeader: !!req.headers.authorization,
      authHeader: req.headers.authorization,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('templates')
  async getTemplates(
    @CurrentUser() user?: AuthUser,
  ): Promise<TemplateResponse[]> {
    console.log(`Fetching templates for user: ${user?.email}`);
    return this.service.getTemplates();
  }

  @Get('audience-options')
  async getAudienceOptions(
    @CurrentUser() user?: AuthUser,
  ): Promise<AudienceOptionsResponse> {
    console.log(`Fetching audience options for user: ${user?.email}`);
    return this.service.getAudienceOptions(user);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user?: AuthUser,
  ): Promise<FrontendAnnouncement> {
    console.log(`Fetching announcement ${id} for user: ${user?.email}`);
    return this.service.findOne(id, user?.id);
  }

  @Post()
  async create(
    @Body() dto: CreateAnnouncementDto,
    @CurrentUser() user: AuthUser,
    @Req() req: any, // Changed from Request to any
  ): Promise<FrontendAnnouncement> {
    if (!user) {
      throw new BadRequestException('User authentication required');
    }

    console.log(
      `Creating announcement for user: ${user.email} (ID: ${user.id})`,
    );
    console.log(
      `User role: ${user.role}, Staff Profile: ${user.staffProfile?.id}`,
    );

    return this.service.create(dto, user);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAnnouncementDto,
    @CurrentUser() user: AuthUser,
  ): Promise<FrontendAnnouncement> {
    if (!user) {
      throw new BadRequestException('User authentication required');
    }
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ): Promise<{ success: boolean }> {
    if (!user) {
      throw new BadRequestException('User authentication required');
    }
    return this.service.remove(id, user);
  }

  @Post('emergency')
  @UseInterceptors(FileInterceptor('voiceRecording'))
  async createEmergency(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @CurrentUser() user: AuthUser,
  ) {
    if (!user) {
      throw new BadRequestException('User authentication required');
    }

    if (!this.canSendEmergency(user)) {
      throw new BadRequestException('You do not have permission for emergency');
    }

    return this.service.createEmergencyWithVoice(body, file, user);
  }

  @Get(':id/receipts')
  async getReceipts(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user?: AuthUser,
  ): Promise<ReceiptResponse[]> {
    return this.service.getReceipts(id, user);
  }

  // Helper method to check emergency announcement permissions
  private canSendEmergency(user: AuthUser): boolean {
    const allowedRoles = ['ADMIN', 'PRINCIPAL', 'HEAD_TEACHER'];
    return allowedRoles.includes(user.role);
  }

  // Public health check endpoint
  @Get('public/health')
  @Public()
  healthCheck() {
    return {
      status: 'OK',
      service: 'announcement-microservice',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  }
}
