import { Controller, Get, Request } from '@nestjs/common';
import { AuthUserPayload } from './auth/types';

@Controller('test')
export class TestController {
    @Get('profile')
    getProfile(@Request() req: any) {
        return {
            message: 'Authentication working!',
            user: req.user as AuthUserPayload,
        };
    }
}
