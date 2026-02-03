import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
    Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

@Injectable()
export class RemoteAuthGuard implements CanActivate {
    private readonly logger = new Logger(RemoteAuthGuard.name);

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const token = this.extractTokenFromHeader(request);

        if (!token) {
            throw new UnauthorizedException('Missing authentication token');
        }

        try {
            const authUrl = this.configService.get<string>('AUTH_MS_URL');
            if (!authUrl) {
                this.logger.error('AUTH_MS_URL is not configured');
                throw new UnauthorizedException('System configuration error');
            }

            // Append /verify if the base URL assumes it's the root of the auth service
            // Based on user snippet, Controller is 'auth', method is 'verify'. 
            // User said AUTH_MS_URL=http://.../auth. So we usually append /verify.
            const verifyEndpoint = `${authUrl}/verify`;

            const { data } = await firstValueFrom(
                this.httpService.post(
                    verifyEndpoint,
                    {},
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    }
                ).pipe(
                    catchError((error: AxiosError) => {
                        this.logger.error(`Auth service validation failed: ${error.message}`);
                        throw new UnauthorizedException('Invalid or expired token');
                    }),
                ),
            );

            // Attach user to request
            request.user = data;
            return true;
        } catch (error) {
            if (error instanceof UnauthorizedException) {
                throw error;
            }
            this.logger.error('Authentication Error', error);
            throw new UnauthorizedException('Could not verify token');
        }
    }

    private extractTokenFromHeader(request: any): string | undefined {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
    }
}
