import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthUserPayload } from './types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET') || 'secret', // Fallback for dev/test
        });
    }

    async validate(payload: AuthUserPayload) {
        // Here we can perform additional validation if needed,
        // but typically for microservices we trust the token signature.
        // The payload is already verified by the time it reaches here.
        return payload;
    }
}
