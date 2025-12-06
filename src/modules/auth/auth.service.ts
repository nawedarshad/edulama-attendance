import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface AuthUser {
  id: number;
  email: string;
  role: string;
  name?: string;
  // Remove schoolId since it's not in your auth response
  staffProfile?: {
    id: number;
    designation?: string;
    department?: string;
  } | null;
  studentProfile?: {
    id: number;
    admissionNo?: string;
    classId?: number;
  } | null;
  iat?: number;
  exp?: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly authMsUrl = process.env.AUTH_MS_URL!;

  constructor(private readonly httpService: HttpService) {
    if (!this.authMsUrl) {
      throw new Error('AUTH_MS_URL environment variable is not set');
    }
    this.logger.log(`Auth service initialized with URL: ${this.authMsUrl}`);
  }

  async verifyToken(token: string): Promise<AuthUser> {
    try {
      this.logger.debug(`Verifying token with auth microservice`);

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.authMsUrl}/verify`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            timeout: 5000,
          },
        ),
      );

      if (!response.data || !response.data.id) {
        throw new UnauthorizedException(
          'Invalid user data received from auth service',
        );
      }

      this.logger.debug(
        `User verified: ${response.data.email} (ID: ${response.data.id})`,
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(
        `Auth verification failed: ${error.message}`,
        error.stack,
      );

      if (error.response) {
        const { status, data } = error.response;
        if (status === 401) {
          throw new UnauthorizedException(
            data?.message || 'Invalid or expired token',
          );
        }
        if (status === 403) {
          throw new UnauthorizedException(data?.message || 'Access denied');
        }
      }

      throw new UnauthorizedException('Failed to verify authentication');
    }
  }

  async getUserFromRequest(req: any): Promise<AuthUser | null> {
    try {
      // Get token from Authorization header
      const authHeader = req.headers['authorization'];
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        this.logger.debug('No authorization header found');
        return null;
      }

      const token = authHeader.split(' ')[1];
      if (!token) {
        this.logger.debug('No token found in authorization header');
        return null;
      }

      const user = await this.verifyToken(token);
      return user;
    } catch (error) {
      this.logger.error(`Error getting user from request: ${error.message}`);
      return null;
    }
  }

  async getCurrentUser(req: any): Promise<AuthUser> {
    const user = await this.getUserFromRequest(req);
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    return user;
  }
}

// Export type for type-only imports
export type { AuthUser as AuthUserType };
