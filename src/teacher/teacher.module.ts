import { Module } from '@nestjs/common';
import { TeacherAttendanceModule } from './attendance/teacher-attendance.module';

@Module({
    imports: [TeacherAttendanceModule],
})
export class TeacherModule { }
