export type UserRole = 'PRINCIPAL' | 'TEACHER' | 'STUDENT' | 'PARENT' | 'ADMIN' | 'SCHOOL_ADMINISTRATOR';

export interface AuthUserPayload {
    id: number;
    email: string;
    schoolId: number;
    role: UserRole;
    permissions: string[];
    academicYearId?: number;
    academicYearName?: string;
}
