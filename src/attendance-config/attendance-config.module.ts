import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AttendanceConfigController } from './attendance-config.controller';
import { AttendanceConfigService } from './attendance-config.service';

@Module({
    imports: [AuthModule],
    controllers: [AttendanceConfigController],
    providers: [AttendanceConfigService],
    exports: [AttendanceConfigService],
})
export class AttendanceConfigModule { }
