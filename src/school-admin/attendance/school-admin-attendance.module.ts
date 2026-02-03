import { Module } from '@nestjs/common';
import { SchoolAdminAttendanceController } from './school-admin-attendance.controller';
import { SchoolAdminAttendanceService } from './school-admin-attendance.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';

@Module({
    imports: [PrismaModule, AuthModule],
    controllers: [SchoolAdminAttendanceController],
    providers: [SchoolAdminAttendanceService],
})
export class SchoolAdminAttendanceModule { }
