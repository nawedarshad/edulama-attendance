import { Module } from '@nestjs/common';
import { PrismaModule } from './database/prisma.module';
import { AnnouncementModule } from './modules/announcement/announcement.module';
import { AudienceModule } from './modules/audience/audience.module';
import { IntegrationModule } from './modules/integration/integration.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    AnnouncementModule,
    AudienceModule,
    IntegrationModule,
    AudienceModule,
  ],
})
export class AppModule {}
