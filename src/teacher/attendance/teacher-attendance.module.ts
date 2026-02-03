import { Module } from '@nestjs/common';
import { TeacherAttendanceController } from './teacher-attendance.controller';
import { TeacherAttendanceService } from './teacher-attendance.service';
import { AttendanceConfigModule } from '../../attendance-config/attendance-config.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module'; // If needed for injection or guards

@Module({
    imports: [
        AttendanceConfigModule,
        PrismaModule,
        AuthModule
    ],
    controllers: [TeacherAttendanceController],
    providers: [TeacherAttendanceService],
})
export class TeacherAttendanceModule { }
