import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { RemoteAuthGuard } from './auth/remote-auth.guard';
import { PrismaModule } from './prisma/prisma.module';
import { AttendanceConfigModule } from './attendance-config/attendance-config.module';
import { SchoolAdminAttendanceModule } from './school-admin/attendance/school-admin-attendance.module';
import { TeacherModule } from './teacher/teacher.module';
import { LoggerMiddleware } from './common/middleware/logger.middleware';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        AuthModule,
        PrismaModule,
        AttendanceConfigModule,
        SchoolAdminAttendanceModule,
        TeacherModule,
    ],
    controllers: [],
    providers: [
        {
            provide: APP_GUARD,
            useClass: RemoteAuthGuard,
        },
    ],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(LoggerMiddleware)
            .forRoutes('*');
    }
}
