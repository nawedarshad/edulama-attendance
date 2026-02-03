import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { JwtStrategy } from './jwt.strategy';
import { RemoteAuthGuard } from './remote-auth.guard';

@Module({
    imports: [
        HttpModule,
        PassportModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: { expiresIn: '1d' }, // Fallback, though we mostly verify here
            }),
            inject: [ConfigService],
        }),
    ],
    providers: [JwtStrategy, RemoteAuthGuard],
    exports: [JwtModule, JwtStrategy, RemoteAuthGuard, HttpModule],
})
export class AuthModule { }
