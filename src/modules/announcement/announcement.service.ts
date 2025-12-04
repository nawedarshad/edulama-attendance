import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  AnnouncementPriority,
  AnnouncementStatus,
  AudienceType,
} from '@prisma/client';

// Export the interface
export interface FrontendAnnouncement {
  id: number;
  title: string;
  description: string;
  priority: 'NORMAL' | 'URGENT' | 'CRITICAL';
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'ACTIVE' | 'EXPIRED' | 'SCHEDULED';
  audience: Array<{
    type: AudienceType;
    ids: number[];
    names: string[];
  }>;
  channels: any[];
  attachments: Array<{
    id: number;
    name: string;
    url: string;
    type: string;
    size: number;
  }>;
  scheduledFor: string;
  expiresAt: string;
  createdBy: string;
  createdAt: string;
  readReceipts: Array<{
    userId: number;
    userName: string;
    role: string;
    viewedAt: string;
    acknowledged: boolean;
  }>;
  approvalWorkflow: any[];
  isEmergency: boolean;
  tags: string[];
}

// Also export the response types
export interface AnnouncementsResponse {
  announcements: FrontendAnnouncement[];
}

export interface StatsResponse {
  total: number;
  active: number;
  scheduled: number;
  draft: number;
  urgent: number;
  readRate: number;
}

// Template response interface
export interface TemplateResponse {
  id: number;
  name: string;
  subject: string | null;
  body: string;
  placeholders: any[];
}

// Receipt response interface
export interface ReceiptResponse {
  userId: number;
  userName: string;
  role: string;
  viewedAt: string;
  acknowledged: boolean;
}

// Audience options interface
export interface AudienceOptionsResponse {
  classes: any[];
  sections: any[];
  roles: any[];
  staff: any[];
  students: any[];
}

// Add this missing interface
interface AnnouncementWithRelations {
  id: number;
  title: string;
  body: string;
  createdById: number;
  priority: AnnouncementPriority;
  status: AnnouncementStatus;
  isEmergency: boolean;
  scheduledAt: Date | null;
  expireAt: Date | null;
  createdAt: Date;
  createdBy: {
    name: string;
    role?: { name: string };
  };
  audiences: any[];
  attachments: any[];
  acknowledgements: Array<{
    userId: number;
    createdAt: Date;
    ackType: string;
    user?: {
      name: string;
      role?: { name: string };
    };
  }>;
}

// Type for audience rows to be created
interface AudienceRowData {
  announcementId: number;
  type: AudienceType;
  classId?: number | null;
  sectionId?: number | null;
  studentId?: number | null;
  staffId?: number | null;
  roleId?: number | null;
  customMeta?: any;
}

// DTO interfaces - IMPORTANT: These match the schema enums
interface AudienceInputDto {
  type: AudienceType; // Use the actual enum type
  ids: number[];
  names?: string[];
}

interface CreateAnnouncementDto {
  title: string;
  description: string;
  priority?: AnnouncementPriority;
  status?: 'DRAFT' | 'PENDING_APPROVAL' | 'ACTIVE' | 'EXPIRED' | 'SCHEDULED';
  audience?: AudienceInputDto[];
  scheduledFor?: string;
  expiresAt?: string;
  isEmergency?: boolean;
  // Note: tags field removed since there's no AnnouncementTag model in schema
}

interface UpdateAnnouncementDto extends Partial<CreateAnnouncementDto> {}

@Injectable()
export class AnnouncementService {
  constructor(private prisma: PrismaService) {}

  // Map DB status to frontend
  private mapStatusToFrontend(status: AnnouncementStatus): string {
    switch (status) {
      case 'DRAFT':
        return 'DRAFT';
      case 'SCHEDULED':
        return 'SCHEDULED';
      case 'PUBLISHED':
        return 'ACTIVE';
      case 'EXPIRED':
        return 'EXPIRED';
      case 'CANCELLED':
        return 'EXPIRED';
      default:
        return 'DRAFT';
    }
  }

  // Map frontend status to DB
  private mapStatusToDb(status?: string): AnnouncementStatus {
    if (!status) return 'DRAFT';

    switch (status.toUpperCase()) {
      case 'SCHEDULED':
        return 'SCHEDULED';
      case 'ACTIVE':
      case 'PUBLISHED':
        return 'PUBLISHED';
      case 'EXPIRED':
        return 'EXPIRED';
      case 'DRAFT':
      case 'PENDING_APPROVAL':
      default:
        return 'DRAFT';
    }
  }

  private mapAnnouncementToFrontend(
    a: AnnouncementWithRelations,
  ): FrontendAnnouncement {
    return {
      id: a.id,
      title: a.title,
      description: a.body,
      priority: a.priority as 'NORMAL' | 'URGENT' | 'CRITICAL',
      status: this.mapStatusToFrontend(a.status) as
        | 'DRAFT'
        | 'PENDING_APPROVAL'
        | 'ACTIVE'
        | 'EXPIRED'
        | 'SCHEDULED',
      audience: (a.audiences || []).map((aud) => {
        const type = aud.type;

        const ids: number[] = [];
        const names: string[] = [];

        // Extract IDs and try to get names
        if (aud.classId) {
          ids.push(aud.classId);
          names.push('Class');
        }
        if (aud.sectionId) {
          ids.push(aud.sectionId);
          names.push('Section');
        }
        if (aud.studentId) {
          ids.push(aud.studentId);
          names.push('Student');
        }
        if (aud.staffId) {
          ids.push(aud.staffId);
          names.push('Staff');
        }
        if (aud.roleId) {
          ids.push(aud.roleId);
          names.push('Role');
        }

        // If no specific IDs but has customMeta
        if (ids.length === 0 && aud.customMeta) {
          const meta = aud.customMeta as any;
          if (meta.displayName) {
            names.push(meta.displayName);
          } else if (meta.teacherType) {
            names.push('All Teachers');
          } else if (meta.parentType) {
            names.push('All Parents');
          } else {
            names.push(`All ${type.toLowerCase()}s`);
          }
        }

        return {
          type,
          ids,
          names,
        };
      }),
      channels: [],
      attachments: (a.attachments || []).map((att) => ({
        id: att.id,
        name: att.fileName,
        url: att.fileUrl,
        type: att.fileType,
        size: att.fileSize ?? 0,
      })),
      scheduledFor: a.scheduledAt ? a.scheduledAt.toISOString() : '',
      expiresAt: a.expireAt ? a.expireAt.toISOString() : '',
      createdBy: a.createdBy ? a.createdBy.name : 'System',
      createdAt: a.createdAt.toISOString(),
      readReceipts: (a.acknowledgements || []).map((ack) => ({
        userId: ack.userId,
        userName: ack.user?.name ?? '',
        role: ack.user?.role?.name ?? '',
        viewedAt: ack.createdAt.toISOString(),
        acknowledged: ack.ackType !== 'READ',
      })),
      approvalWorkflow: [],
      isEmergency: a.isEmergency,
      tags: [], // Empty array since no tag model in schema
    };
  }

  async findAll(query: {
    status?: string;
    priority?: string;
    audience?: string;
    search?: string;
  }): Promise<AnnouncementsResponse> {
    const where: any = {};

    if (query.priority && query.priority !== 'ALL') {
      where.priority = query.priority as AnnouncementPriority;
    }

    if (query.status && query.status !== 'ALL') {
      where.status = this.mapStatusToDb(query.status);
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { body: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const announcements = await this.prisma.announcement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { include: { role: true } },
        audiences: true,
        attachments: true,
        acknowledgements: { include: { user: { include: { role: true } } } },
      },
    });

    const mapped = announcements.map((a) =>
      this.mapAnnouncementToFrontend(a as any),
    );

    return {
      announcements: mapped,
    };
  }

  async getStats(): Promise<StatsResponse> {
    const [total, active, scheduled, draft, urgent] = await Promise.all([
      this.prisma.announcement.count(),
      this.prisma.announcement.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.announcement.count({ where: { status: 'SCHEDULED' } }),
      this.prisma.announcement.count({ where: { status: 'DRAFT' } }),
      this.prisma.announcement.count({ where: { priority: 'URGENT' } }),
    ]);

    return {
      total,
      active,
      scheduled,
      draft,
      urgent,
      readRate: 0,
    };
  }

  async findOne(id: number): Promise<FrontendAnnouncement> {
    const a = await this.prisma.announcement.findUnique({
      where: { id },
      include: {
        createdBy: { include: { role: true } },
        audiences: true,
        attachments: true,
        acknowledgements: { include: { user: { include: { role: true } } } },
      },
    });
    if (!a) throw new NotFoundException('Announcement not found');
    return this.mapAnnouncementToFrontend(a as any);
  }

  async create(dto: CreateAnnouncementDto): Promise<FrontendAnnouncement> {
    const status = this.mapStatusToDb(dto.status);
    const createdById = 3; // TODO: use auth user later

    // Create the announcement first
    const announcement = await this.prisma.announcement.create({
      data: {
        title: dto.title,
        body: dto.description,
        createdById,
        priority: dto.priority ?? AnnouncementPriority.NORMAL,
        status,
        isEmergency: dto.isEmergency ?? false,
        scheduledAt: dto.scheduledFor ? new Date(dto.scheduledFor) : null,
        expireAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });

    // Handle audience
    if (dto.audience && dto.audience.length > 0) {
      const audienceRows: AudienceRowData[] = [];

      for (const aud of dto.audience) {
        const type = aud.type;

        if (type === 'ALL_SCHOOL') {
          // For ALL_SCHOOL, create a single record without specific IDs
          audienceRows.push({
            announcementId: announcement.id,
            type,
          });
        } else if (aud.ids && aud.ids.length > 0) {
          // For specific audiences (with IDs), create one record per ID
          for (const id of aud.ids) {
            const audienceData: AudienceRowData = {
              announcementId: announcement.id,
              type,
            };

            // Map ID to the correct field based on audience type
            switch (type) {
              case 'CLASS':
                audienceData.classId = id;
                break;
              case 'SECTION':
                audienceData.sectionId = id;
                break;
              case 'STUDENT':
                audienceData.studentId = id;
                break;
              case 'STAFF':
              case 'TEACHER':
                audienceData.staffId = id;
                break;
              case 'ROLE':
                audienceData.roleId = id;
                break;
              case 'CUSTOM_GROUP':
                // For custom groups, store in metadata
                audienceData.customMeta = { ids: [id], names: aud.names };
                break;
              case 'PARENTS':
                // For parents, store in customMeta
                audienceData.customMeta = {
                  ids: [id],
                  type: 'PARENTS',
                  names: aud.names,
                };
                break;
              case 'TAG':
                audienceData.customMeta = { ids: [id], type: 'TAG' };
                break;
              case 'BRANCH':
                audienceData.customMeta = { ids: [id], type: 'BRANCH' };
                break;
            }

            audienceRows.push(audienceData);
          }
        } else {
          // For audiences with EMPTY IDs (meaning "All X")
          const audienceData: AudienceRowData = {
            announcementId: announcement.id,
            type,
          };

          // Store names in customMeta
          audienceData.customMeta = {
            displayName: aud.names?.[0] || `All ${type.toLowerCase()}s`,
          };

          // For TEACHER type, map it to STAFF in database
          if (type === 'TEACHER') {
            audienceData.type = 'STAFF';
            audienceData.customMeta = {
              ...audienceData.customMeta,
              teacherType: true,
            };
          }
          // For PARENTS type, store in customMeta
          else if (type === 'PARENTS') {
            audienceData.customMeta = {
              ...audienceData.customMeta,
              parentType: true,
            };
          }

          audienceRows.push(audienceData);
        }
      }

      if (audienceRows.length > 0) {
        await this.prisma.announcementAudience.createMany({
          data: audienceRows,
        });
      }
    }

    const full = await this.findOne(announcement.id);
    return full;
  }

  async update(
    id: number,
    dto: UpdateAnnouncementDto,
  ): Promise<FrontendAnnouncement> {
    await this.findOne(id); // throws if not exists

    const status = dto.status ? this.mapStatusToDb(dto.status) : undefined;

    // First update the announcement
    const updated = await this.prisma.announcement.update({
      where: { id },
      data: {
        title: dto.title,
        body: dto.description,
        priority: dto.priority,
        status,
        isEmergency: dto.isEmergency,
        scheduledAt: dto.scheduledFor ? new Date(dto.scheduledFor) : undefined,
        expireAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
    });

    // If audience is provided, update it
    if (dto.audience !== undefined) {
      // Delete existing audience records
      await this.prisma.announcementAudience.deleteMany({
        where: { announcementId: id },
      });

      // Create new audience records if provided
      if (dto.audience && dto.audience.length > 0) {
        const audienceRows: AudienceRowData[] = [];

        for (const aud of dto.audience) {
          const type = aud.type;

          if (type === 'ALL_SCHOOL') {
            audienceRows.push({
              announcementId: id,
              type,
            });
          } else if (aud.ids && aud.ids.length > 0) {
            // Specific IDs
            for (const idValue of aud.ids) {
              const audienceData: AudienceRowData = {
                announcementId: id,
                type,
              };

              switch (type) {
                case 'CLASS':
                  audienceData.classId = idValue;
                  break;
                case 'SECTION':
                  audienceData.sectionId = idValue;
                  break;
                case 'STUDENT':
                  audienceData.studentId = idValue;
                  break;
                case 'STAFF':
                case 'TEACHER':
                  audienceData.staffId = idValue;
                  break;
                case 'ROLE':
                  audienceData.roleId = idValue;
                  break;
                case 'CUSTOM_GROUP':
                  audienceData.customMeta = {
                    ids: [idValue],
                    names: aud.names,
                  };
                  break;
                case 'PARENTS':
                  audienceData.customMeta = {
                    ids: [idValue],
                    type: 'PARENTS',
                    names: aud.names,
                  };
                  break;
                case 'TAG':
                  audienceData.customMeta = { ids: [idValue], type: 'TAG' };
                  break;
                case 'BRANCH':
                  audienceData.customMeta = { ids: [idValue], type: 'BRANCH' };
                  break;
              }

              audienceRows.push(audienceData);
            }
          } else {
            // Empty IDs means "All of this type"
            const audienceData: AudienceRowData = {
              announcementId: id,
              type,
            };

            // For TEACHER type, map it to STAFF in database
            if (type === 'TEACHER') {
              audienceData.type = 'STAFF';
              audienceData.customMeta = { teacherType: true };
            }
            // For PARENTS type, store in customMeta
            else if (type === 'PARENTS') {
              audienceData.customMeta = { parentType: true };
            }

            audienceRows.push(audienceData);
          }
        }

        if (audienceRows.length > 0) {
          await this.prisma.announcementAudience.createMany({
            data: audienceRows,
          });
        }
      }
    }

    return this.findOne(updated.id);
  }

  async remove(id: number): Promise<{ success: boolean }> {
    await this.findOne(id);
    await this.prisma.announcement.delete({ where: { id } });
    return { success: true };
  }

  async createEmergency(
    dto: CreateAnnouncementDto,
  ): Promise<FrontendAnnouncement> {
    return this.create({
      ...dto,
      isEmergency: true,
      priority: 'CRITICAL',
      status: 'ACTIVE',
    });
  }

  async getReceipts(id: number): Promise<ReceiptResponse[]> {
    const acks = await this.prisma.announcementAck.findMany({
      where: { announcementId: id },
      include: { user: { include: { role: true } } },
    });

    return acks.map((ack) => ({
      userId: ack.userId,
      userName: ack.user?.name ?? '',
      role: ack.user?.role?.name ?? '',
      viewedAt: ack.createdAt.toISOString(),
      acknowledged: ack.ackType !== 'READ',
    }));
  }

  async getTemplates(): Promise<TemplateResponse[]> {
    // No template model in schema, return empty array
    return [];
  }

  async getAudienceOptions(): Promise<AudienceOptionsResponse> {
    return {
      classes: [],
      sections: [],
      roles: [],
      staff: [],
      students: [],
    };
  }
}
