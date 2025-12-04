import { Module } from '@nestjs/common';
import { PrismaModule } from './database/prisma.module';
import { AnnouncementModule } from './modules/announcement/announcement.module';
import { AudienceModule } from './modules/audience/audience.module';
import { IntegrationModule } from './modules/integration/integration.module';

@Module({
  imports: [
    PrismaModule,
    AnnouncementModule,
    AudienceModule,
    IntegrationModule,
    AudienceModule,
  ],
})
export class AppModule {}
