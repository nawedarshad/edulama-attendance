import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);
  private readonly AUTH_URL =
    process.env.AUTH_MS_URL || 'http://167.71.229.252:4000/auth';

  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Check @Public()
    const isPublic = this.reflector.get<boolean>(
      'isPublic',
      context.getHandler(),
    );
    if (isPublic) {
      this.logger.debug(`Public endpoint: ${request.method} ${request.url}`);
      return true;
    }

    this.logger.debug(`Auth check for: ${request.method} ${request.url}`);
    this.logger.debug(`Headers: ${JSON.stringify(request.headers)}`);
    this.logger.debug(`Cookies: ${request.headers.cookie}`);

    // 1️⃣ Try Authorization header
    let token: string | null = null;
    const authHeader = request.headers['authorization'];

    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.replace('Bearer ', '').trim();
      this.logger.debug('Token found in Authorization header');
    }

    // 2️⃣ If missing → Try cookies
    if (!token && request.headers.cookie) {
      // Extract accessToken from cookie string
      const cookies = request.headers.cookie.split(';').map((c) => c.trim());
      const accessTokenCookie = cookies.find((c) =>
        c.startsWith('accessToken='),
      );
      if (accessTokenCookie) {
        token = accessTokenCookie.split('=')[1];
        this.logger.debug('Token found in cookies');
      }
    }

    // 3️⃣ If still no token, check request.cookies (if cookie-parser is used)
    if (!token && request.cookies?.accessToken) {
      token = request.cookies.accessToken;
      this.logger.debug('Token found in request.cookies');
    }

    if (!token) {
      this.logger.warn('No authorization token provided');
      throw new UnauthorizedException({
        message: 'No authorization token provided',
        details: {
          hasAuthHeader: !!authHeader,
          hasCookies: !!request.headers.cookie,
          endpoint: `${request.method} ${request.url}`,
        },
      });
    }

    this.logger.debug(
      `Token found (first 10 chars): ${token.substring(0, 10)}...`,
    );

    try {
      // 4️⃣ Send token to Auth MS with proper headers
      const response = await fetch(`${this.AUTH_URL}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          // Forward original cookies if needed
          Cookie: request.headers.cookie || '',
        },
        body: JSON.stringify({
          token,
          requestOrigin: request.headers.origin,
          requestPath: request.url,
        }),
      });

      this.logger.debug(`Auth service response: ${response.status}`);

      if (!response.ok) {
        let errorDetails = `Status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorDetails += ` - ${JSON.stringify(errorData)}`;
        } catch (e) {
          // Ignore if response is not JSON
        }

        this.logger.error(`Auth verification failed: ${errorDetails}`);
        throw new UnauthorizedException({
          message: 'Invalid or expired token',
          details: errorDetails,
        });
      }

      // 5️⃣ Attach verified user
      const user = await response.json();
      this.logger.debug(`User verified: ${user.email} (${user.id})`);

      // Attach user to request
      request.user = user;

      // Also attach the token for other middleware/services
      request.token = token;

      return true;
    } catch (error) {
      this.logger.error(`Auth verification error: ${error.message}`);

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException({
        message: 'Authentication service unavailable',
        details: error.message,
      });
    }
  }
}
