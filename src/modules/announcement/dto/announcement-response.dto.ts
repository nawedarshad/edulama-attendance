export class AnnouncementResponseDto {
  id: number;
  title: string;
  description: string;
  priority: 'NORMAL' | 'URGENT' | 'CRITICAL';
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'ACTIVE' | 'EXPIRED' | 'SCHEDULED';
  audience: Array<{
    type: string;
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

export class AnnouncementsListResponseDto {
  announcements: AnnouncementResponseDto[];
}

export class StatsResponseDto {
  total: number;
  active: number;
  scheduled: number;
  draft: number;
  urgent: number;
  readRate: number;
}

export class ReceiptResponseDto {
  userId: number;
  userName: string;
  role: string;
  viewedAt: string;
  acknowledged: boolean;
}

export class TemplateResponseDto {
  id: number;
  name: string;
  subject: string;
  body: string;
  placeholders: any[];
}

export class AudienceOptionsResponseDto {
  classes: any[];
  sections: any[];
  roles: any[];
  staff: any[];
  students: any[];
}
