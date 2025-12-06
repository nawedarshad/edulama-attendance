import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SpacesService } from '../../common/spaces.service';

import {
  AnnouncementPriority,
  AnnouncementStatus,
  AudienceType,
} from '@prisma/client';
import type { AuthUser } from '../auth/auth.service';

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
  createdById: number;
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
  total: number;
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
  acknowledgedAt?: string;
}

// Audience options interface
export interface AudienceOptionsResponse {
  classes: Array<{ id: number; name: string }>;
  sections: Array<{
    id: number;
    name: string;
    classId: number;
    className: string;
  }>;
  roles: Array<{ id: number; name: string }>;
  staff: Array<{ id: number; name: string; email: string; role: string }>;
  students: Array<{ id: number; name: string; email: string; classId: number }>;
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
    id: number;
    name: string;
    email: string;
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
      email: string;
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

// DTO interfaces
interface AudienceInputDto {
  type: AudienceType;
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
}

interface UpdateAnnouncementDto extends Partial<CreateAnnouncementDto> {}

@Injectable()
export class AnnouncementService {
  constructor(
    private prisma: PrismaService,
    private spaces: SpacesService,
  ) {}

  // Check if user has permission to view/update announcement
  private async checkUserPermission(
    announcementId: number,
    userId?: number,
  ): Promise<boolean> {
    if (!userId) return false;

    const announcement = await this.prisma.announcement.findUnique({
      where: { id: announcementId },
      select: { createdById: true },
    });

    // Users can access their own announcements
    if (announcement && announcement.createdById === userId) {
      return true;
    }

    // TODO: Add admin/supervisor role checks here
    // For now, only creators can access their announcements
    return false;
  }

  async createEmergencyWithVoice(
    dto: any,
    file: Express.Multer.File | null,
    user: AuthUser,
  ): Promise<FrontendAnnouncement> {
    // 1. Create emergency announcement
    const announcement = await this.prisma.announcement.create({
      data: {
        title: dto.title,
        body: dto.message,
        createdById: user.id,
        priority: 'CRITICAL',
        status: 'PUBLISHED',
        isEmergency: true,
      },
    });

    // 2. Add default audience (all school)
    await this.prisma.announcementAudience.create({
      data: {
        announcementId: announcement.id,
        type: 'ALL_SCHOOL',
      },
    });

    // 3. If file exists → upload to Spaces
    if (file) {
      const fileUrl = await this.spaces.uploadFile(file, 'emergency');

      await this.prisma.announcementAttachment.create({
        data: {
          announcementId: announcement.id,
          fileName: file.originalname,
          fileType: file.mimetype,
          fileSize: file.size,
          fileUrl,
          uploadedById: user.id,
        },
      });
    }

    // 4. Return complete
    return this.findOne(announcement.id, user.id);
  }

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
      createdById: a.createdById,
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
      tags: [],
    };
  }

  async findAll(
    query: {
      status?: string;
      priority?: string;
      audience?: string;
      search?: string;
    },
    userId?: number,
  ): Promise<AnnouncementsResponse> {
    const where: any = {};

    // Filter by user if not admin
    if (userId) {
      where.createdById = userId; // Users only see their own announcements
    }

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
      total: mapped.length,
    };
  }

  async getStats(userId?: number): Promise<StatsResponse> {
    const where: any = {};

    if (userId) {
      where.createdById = userId;
    }

    const [total, active, scheduled, draft, urgent] = await Promise.all([
      this.prisma.announcement.count({ where }),
      this.prisma.announcement.count({
        where: { ...where, status: 'PUBLISHED' },
      }),
      this.prisma.announcement.count({
        where: { ...where, status: 'SCHEDULED' },
      }),
      this.prisma.announcement.count({ where: { ...where, status: 'DRAFT' } }),
      this.prisma.announcement.count({
        where: { ...where, priority: 'URGENT' },
      }),
    ]);

    return {
      total,
      active,
      scheduled,
      draft,
      urgent,
      readRate: 0, // Calculate based on your logic
    };
  }

  async findOne(id: number, userId?: number): Promise<FrontendAnnouncement> {
    const announcement = await this.prisma.announcement.findUnique({
      where: { id },
      include: {
        createdBy: { include: { role: true } },
        audiences: true,
        attachments: true,
        acknowledgements: { include: { user: { include: { role: true } } } },
      },
    });

    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    // Check permission if userId provided
    if (userId && announcement.createdById !== userId) {
      throw new ForbiddenException(
        'You do not have permission to view this announcement',
      );
    }

    return this.mapAnnouncementToFrontend(announcement as any);
  }

  async create(
    dto: CreateAnnouncementDto,
    user: AuthUser,
  ): Promise<FrontendAnnouncement> {
    const status = this.mapStatusToDb(dto.status);

    // Validate user can create announcements
    if (!user || !user.id) {
      throw new BadRequestException('Invalid user');
    }

    // Check emergency announcement permissions
    if (dto.isEmergency && !this.canCreateEmergency(user)) {
      throw new ForbiddenException(
        'You do not have permission to create emergency announcements',
      );
    }

    // Create the announcement with user context
    const announcement = await this.prisma.announcement.create({
      data: {
        title: dto.title,
        body: dto.description,
        createdById: user.id,
        priority: dto.priority ?? AnnouncementPriority.NORMAL,
        status,
        isEmergency: dto.isEmergency ?? false,
        scheduledAt: dto.scheduledFor ? new Date(dto.scheduledFor) : null,
        expireAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });

    // Handle audience with user context
    await this.handleAudienceCreation(announcement.id, dto.audience, user);

    const full = await this.findOne(announcement.id, user.id);
    return full;
  }

  async update(
    id: number,
    dto: UpdateAnnouncementDto,
    user: AuthUser,
  ): Promise<FrontendAnnouncement> {
    // Check if announcement exists and user owns it or has admin rights
    const existing = await this.prisma.announcement.findFirst({
      where: {
        id,
        OR: [
          { createdById: user.id }, // User owns it
          ...(this.isAdmin(user) ? [{}] : []), // Admin can edit any
        ],
      },
    });

    if (!existing) {
      throw new NotFoundException('Announcement not found or access denied');
    }

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
        await this.handleAudienceCreation(id, dto.audience, user);
      }
    }

    return this.findOne(updated.id, user.id);
  }

  async remove(id: number, user: AuthUser): Promise<{ success: boolean }> {
    // Check ownership before deleting
    const existing = await this.prisma.announcement.findFirst({
      where: {
        id,
        createdById: user.id,
      },
    });

    if (!existing) {
      throw new NotFoundException('Announcement not found or access denied');
    }

    await this.prisma.announcement.delete({ where: { id } });
    return { success: true };
  }

  async createEmergency(
    dto: CreateAnnouncementDto,
    user: AuthUser,
  ): Promise<FrontendAnnouncement> {
    return this.create(
      {
        ...dto,
        isEmergency: true,
        priority: 'CRITICAL',
        status: 'ACTIVE',
      },
      user,
    );
  }

  async getReceipts(id: number, user?: AuthUser): Promise<ReceiptResponse[]> {
    // Check permission if user provided
    if (user) {
      const canAccess = await this.checkUserPermission(id, user.id);
      if (!canAccess) {
        throw new ForbiddenException(
          'You do not have permission to view receipts for this announcement',
        );
      }
    }

    const acks = await this.prisma.announcementAck.findMany({
      where: { announcementId: id },
      include: { user: { include: { role: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return acks.map((ack) => ({
      userId: ack.userId,
      userName: ack.user?.name ?? '',
      role: ack.user?.role?.name ?? '',
      viewedAt: ack.createdAt.toISOString(),
      acknowledged: ack.ackType !== 'READ',
      acknowledgedAt:
        ack.ackType !== 'READ' ? ack.createdAt.toISOString() : undefined,
    }));
  }

  async getTemplates(): Promise<TemplateResponse[]> {
    // Return some default templates
    return [
      {
        id: 1,
        name: 'School Closure',
        subject: 'URGENT: School Closure',
        body: 'Due to unforeseen circumstances, the school will remain closed today. All classes and activities are cancelled. Please stay safe and monitor official channels for updates.',
        placeholders: [],
      },
      {
        id: 2,
        name: 'Transport Delay',
        subject: 'TRANSPORT DELAY NOTICE',
        body: 'School transport services are experiencing delays due to [reason]. Expected delay: [time]. Parents, please make alternate arrangements if necessary.',
        placeholders: ['reason', 'time'],
      },
      {
        id: 3,
        name: 'Safety Alert',
        subject: 'SAFETY ALERT',
        body: 'Important safety notice: [details]. Please follow instructions from school authorities. Emergency contact: [number].',
        placeholders: ['details', 'number'],
      },
      {
        id: 4,
        name: 'Weather Alert',
        subject: 'WEATHER ALERT',
        body: 'Severe weather warning issued for our area. [Instructions]. School operations will continue as normal unless otherwise notified.',
        placeholders: ['Instructions'],
      },
    ];
  }

  async getAudienceOptions(user?: AuthUser): Promise<AudienceOptionsResponse> {
    // Fetch actual data from database based on your schema
    const [classes, sections, roles] = await Promise.all([
      this.prisma.class.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.section
        .findMany({
          select: {
            id: true,
            name: true,
            classId: true,
            class: { select: { name: true } },
          },
          orderBy: { name: 'asc' },
        })
        .then((sections) =>
          sections.map((s) => ({
            id: s.id,
            name: s.name,
            classId: s.classId,
            className: s.class.name,
          })),
        ),
      this.prisma.role.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    // Get staff profiles with user information
    const staffProfiles = await this.prisma.staffProfile.findMany({
      where: user?.id ? { userId: user.id } : undefined, // Filter by user if provided
      include: {
        user: {
          select: { name: true, email: true, role: true },
        },
      },
      orderBy: { user: { name: 'asc' } },
    });

    const staff = staffProfiles.map((s) => ({
      id: s.id,
      name: s.user.name,
      email: s.user.email,
      role: s.designation || s.department || 'Staff',
    }));

    // Get student profiles with user information
    const studentProfiles = await this.prisma.studentProfile.findMany({
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
      orderBy: { user: { name: 'asc' } },
    });

    const students = studentProfiles.map((s) => ({
      id: s.id,
      name: s.user.name,
      email: s.user.email,
      classId: s.classId,
    }));

    return {
      classes,
      sections,
      roles,
      staff,
      students,
    };
  }

  // Helper methods
  private isAdmin(user: AuthUser): boolean {
    return ['ADMIN', 'PRINCIPAL'].includes(user.role);
  }

  private canCreateEmergency(user: AuthUser): boolean {
    const allowedRoles = ['ADMIN', 'PRINCIPAL', 'HEAD_TEACHER'];
    return allowedRoles.includes(user.role);
  }

  private async handleAudienceCreation(
    announcementId: number,
    audience: AudienceInputDto[] | undefined,
    user: AuthUser,
  ): Promise<void> {
    if (!audience || audience.length === 0) {
      // Default to user's school if no audience specified
      const defaultAudience: AudienceRowData = {
        announcementId,
        type: 'ALL_SCHOOL' as AudienceType,
        customMeta: {
          displayName: 'All School',
        },
      };

      await this.prisma.announcementAudience.create({
        data: defaultAudience,
      });
      return;
    }

    const audienceRows: AudienceRowData[] = [];

    for (const aud of audience) {
      const type = aud.type;

      if (type === 'ALL_SCHOOL') {
        audienceRows.push({
          announcementId,
          type,
        });
      } else if (aud.ids && aud.ids.length > 0) {
        for (const id of aud.ids) {
          const audienceData: AudienceRowData = {
            announcementId,
            type,
          };

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
              audienceData.customMeta = { ids: [id], names: aud.names };
              break;
            case 'PARENTS':
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
        const audienceData: AudienceRowData = {
          announcementId,
          type,
        };

        audienceData.customMeta = {
          displayName: aud.names?.[0] || `All ${type.toLowerCase()}s`,
        };

        if (type === 'TEACHER') {
          audienceData.type = 'STAFF';
          audienceData.customMeta = {
            ...audienceData.customMeta,
            teacherType: true,
          };
        } else if (type === 'PARENTS') {
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
}
