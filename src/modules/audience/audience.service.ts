import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AudienceService {
  constructor(private prisma: PrismaService) {}

  async getAudienceOptions() {
    const [classes, sections, students, staff, roles, users] =
      await Promise.all([
        this.getClasses(),
        this.getSections(),
        this.getStudents(),
        this.getStaff(),
        this.getRoles(),
        this.getUsers(),
      ]);

    return {
      classes,
      sections,
      students,
      staff,
      roles,
      users,
    };
  }

  async getClasses() {
    try {
      const classes = await this.prisma.class.findMany({
        select: {
          id: true,
          name: true,
          level: true,
          createdAt: true,
          _count: {
            select: {
              StudentProfile: true,
              sections: true,
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      });

      return classes.map((cls) => ({
        id: cls.id,
        name: cls.name,
        level: cls.level,
        studentCount: cls._count.StudentProfile,
        sectionCount: cls._count.sections,
        createdAt: cls.createdAt,
      }));
    } catch (error) {
      console.error('Error fetching classes:', error);
      return [];
    }
  }

  async getSections() {
    try {
      const sections = await this.prisma.section.findMany({
        include: {
          class: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              StudentProfile: true,
            },
          },
        },
        orderBy: [
          {
            class: {
              name: 'asc',
            },
          },
          {
            name: 'asc',
          },
        ],
      });

      return sections.map((section) => ({
        id: section.id,
        name: section.name,
        classId: section.classId,
        className: section.class.name,
        studentCount: section._count.StudentProfile,
        createdAt: section.createdAt,
      }));
    } catch (error) {
      console.error('Error fetching sections:', error);
      return [];
    }
  }

  async getStudents() {
    try {
      const students = await this.prisma.studentProfile.findMany({
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              photo: true,
            },
          },
          Class: {
            select: {
              id: true,
              name: true,
            },
          },
          Section: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        where: {
          leftDate: null, // Only active students
        },
        orderBy: [
          {
            Class: {
              name: 'asc',
            },
          },
          {
            rollNo: 'asc',
          },
        ],
      });

      return students.map((student) => ({
        id: student.id,
        userId: student.userId,
        name: student.user.name,
        email: student.user.email,
        phone: student.user.phone,
        admissionNo: student.admissionNo,
        rollNo: student.rollNo,
        classId: student.classId,
        className: student.Class.name,
        sectionId: student.sectionId,
        sectionName: student.Section.name,
        photo: student.user.photo,
        type: 'STUDENT',
      }));
    } catch (error) {
      console.error('Error fetching students:', error);
      return [];
    }
  }

  async getStaff() {
    try {
      const staff = await this.prisma.staffProfile.findMany({
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              photo: true,
              role: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        where: {
          exitDate: null, // Only active staff
        },
        orderBy: {
          user: {
            name: 'asc',
          },
        },
      });

      return staff.map((staffMember) => ({
        id: staffMember.id,
        userId: staffMember.userId,
        name: staffMember.user.name,
        email: staffMember.user.email,
        phone: staffMember.user.phone,
        empCode: staffMember.empCode,
        designation: staffMember.designation,
        department: staffMember.department,
        roleId: staffMember.user.role?.id,
        roleName: staffMember.user.role?.name,
        photo: staffMember.user.photo,
        type: 'STAFF',
      }));
    } catch (error) {
      console.error('Error fetching staff:', error);
      return [];
    }
  }

  async getRoles() {
    try {
      const roles = await this.prisma.role.findMany({
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              users: true,
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      });

      return roles.map((role) => ({
        id: role.id,
        name: role.name,
        userCount: role._count.users,
      }));
    } catch (error) {
      console.error('Error fetching roles:', error);
      return [];
    }
  }

  async getUsers() {
    try {
      const users = await this.prisma.user.findMany({
        include: {
          role: {
            select: {
              id: true,
              name: true,
            },
          },
          studentProfile: {
            include: {
              Class: {
                select: {
                  id: true,
                  name: true,
                },
              },
              Section: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          staffProfile: {
            select: {
              id: true,
              empCode: true,
              designation: true,
              department: true,
            },
          },
        },
        where: {
          isActive: true,
        },
        orderBy: {
          name: 'asc',
        },
      });

      return users.map((user) => {
        let profileType = 'USER';
        let profileInfo: any = {};
        if (user.studentProfile) {
          profileType = 'STUDENT';
          profileInfo = {
            admissionNo: user.studentProfile.admissionNo,
            rollNo: user.studentProfile.rollNo,
            classId: user.studentProfile.classId,
            className: user.studentProfile.Class?.name,
            sectionId: user.studentProfile.sectionId,
            sectionName: user.studentProfile.Section?.name,
          };
        } else if (user.staffProfile) {
          profileType = 'STAFF';
          profileInfo = {
            empCode: user.staffProfile.empCode,
            designation: user.staffProfile.designation,
            department: user.staffProfile.department,
          };
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          roleId: user.role?.id,
          roleName: user.role?.name,
          profileType,
          profileInfo,
          photo: user.photo,
          isActive: user.isActive,
          type: 'USER',
        };
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  }

  // Get audience for a specific announcement
  async getAnnouncementAudience(announcementId: number) {
    try {
      const audiences = await this.prisma.announcementAudience.findMany({
        where: {
          announcementId,
        },
        include: {
          class: {
            select: {
              id: true,
              name: true,
            },
          },
          section: {
            select: {
              id: true,
              name: true,
              class: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          student: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              Class: {
                select: {
                  id: true,
                  name: true,
                },
              },
              Section: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          staff: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          role: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Group by type
      const groupedAudiences = audiences.reduce(
        (acc, audience) => {
          const {
            type,
            class: classData,
            section,
            student,
            staff,
            role,
          } = audience;
          if (!acc[type]) {
            acc[type] = {
              type,
              items: [],
            };
          }

          let item: any = {};
          switch (type) {
            case 'CLASS':
              if (classData) {
                item = {
                  id: audience.classId,
                  name: classData.name,
                  type: 'CLASS',
                };
              }
              break;
            case 'SECTION':
              if (section) {
                item = {
                  id: audience.sectionId,
                  name: `${section.class?.name} - ${section.name}`,
                  className: section.class?.name,
                  sectionName: section.name,
                  type: 'SECTION',
                };
              }
              break;
            case 'STUDENT':
              if (student) {
                item = {
                  id: audience.studentId,
                  name: student.user.name,
                  email: student.user.email,
                  admissionNo: student.admissionNo,
                  className: student.Class?.name,
                  sectionName: student.Section?.name,
                  type: 'STUDENT',
                };
              }
              break;
            case 'STAFF':
              if (staff) {
                item = {
                  id: audience.staffId,
                  name: staff.user.name,
                  email: staff.user.email,
                  designation: staff.designation,
                  department: staff.department,
                  type: 'STAFF',
                };
              }
              break;
            case 'ROLE':
              if (role) {
                item = {
                  id: audience.roleId,
                  name: role.name,
                  type: 'ROLE',
                };
              }
              break;
            case 'ALL_SCHOOL':
              item = {
                id: 0,
                name: 'All School',
                type: 'ALL_SCHOOL',
              };
              break;
          }

          if (Object.keys(item).length > 0) {
            acc[type].items.push(item);
          }

          return acc;
        },
        {} as Record<string, any>,
      );

      return Object.values(groupedAudiences);
    } catch (error) {
      console.error('Error fetching announcement audience:', error);
      return [];
    }
  }

  // Get users who should receive an announcement based on audience
  async getTargetUsersForAnnouncement(announcementId: number) {
    try {
      const audiences = await this.prisma.announcementAudience.findMany({
        where: {
          announcementId,
        },
      });

      const userIds = new Set<number>();

      for (const audience of audiences) {
        switch (audience.type) {
          case 'ALL_SCHOOL':
            // All active users
            const allUsers = await this.prisma.user.findMany({
              where: { isActive: true },
              select: { id: true },
            });
            allUsers.forEach((user) => userIds.add(user.id));
            break;

          case 'CLASS':
            if (audience.classId) {
              const classStudents = await this.prisma.studentProfile.findMany({
                where: {
                  classId: audience.classId,
                  leftDate: null, // Active students
                },
                select: { userId: true },
              });
              classStudents.forEach((student) => userIds.add(student.userId));
            }
            break;

          case 'SECTION':
            if (audience.sectionId) {
              const sectionStudents = await this.prisma.studentProfile.findMany(
                {
                  where: {
                    sectionId: audience.sectionId,
                    leftDate: null,
                  },
                  select: { userId: true },
                },
              );
              sectionStudents.forEach((student) => userIds.add(student.userId));
            }
            break;

          case 'STUDENT':
            if (audience.studentId) {
              const student = await this.prisma.studentProfile.findUnique({
                where: { id: audience.studentId },
                select: { userId: true },
              });
              if (student) userIds.add(student.userId);
            }
            break;

          case 'STAFF':
            if (audience.staffId) {
              const staff = await this.prisma.staffProfile.findUnique({
                where: { id: audience.staffId },
                select: { userId: true },
              });
              if (staff) userIds.add(staff.userId);
            }
            break;

          case 'ROLE':
            if (audience.roleId) {
              const roleUsers = await this.prisma.user.findMany({
                where: {
                  roleId: audience.roleId,
                  isActive: true,
                },
                select: { id: true },
              });
              roleUsers.forEach((user) => userIds.add(user.id));
            }
            break;
        }
      }

      // Get full user details
      const users = await this.prisma.user.findMany({
        where: {
          id: {
            in: Array.from(userIds),
          },
          isActive: true,
        },
        include: {
          role: {
            select: {
              name: true,
            },
          },
          studentProfile: {
            select: {
              admissionNo: true,
              Class: {
                select: {
                  name: true,
                },
              },
              Section: {
                select: {
                  name: true,
                },
              },
            },
          },
          staffProfile: {
            select: {
              empCode: true,
              designation: true,
              department: true,
            },
          },
        },
      });

      return users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role?.name,
        isStudent: !!user.studentProfile,
        isStaff: !!user.staffProfile,
        studentInfo: user.studentProfile
          ? {
              admissionNo: user.studentProfile.admissionNo,
              className: user.studentProfile.Class?.name,
              sectionName: user.studentProfile.Section?.name,
            }
          : null,
        staffInfo: user.staffProfile
          ? {
              empCode: user.staffProfile.empCode,
              designation: user.staffProfile.designation,
              department: user.staffProfile.department,
            }
          : null,
      }));
    } catch (error) {
      console.error('Error getting target users:', error);
      return [];
    }
  }

  // Get read receipts for an announcement
  async getAnnouncementReadReceipts(announcementId: number) {
    try {
      const acknowledgements = await this.prisma.announcementAck.findMany({
        where: {
          announcementId,
        },
        include: {
          user: {
            include: {
              role: {
                select: {
                  name: true,
                },
              },
              studentProfile: {
                select: {
                  admissionNo: true,
                  Class: {
                    select: {
                      name: true,
                    },
                  },
                  Section: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
              staffProfile: {
                select: {
                  empCode: true,
                  designation: true,
                  department: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return acknowledgements.map((ack) => ({
        id: ack.id,
        userId: ack.userId,
        userName: ack.user.name,
        userEmail: ack.user.email,
        role: ack.user.role?.name,
        ackType: ack.ackType,
        responseText: ack.responseText,
        viewedAt: ack.createdAt,
        acknowledged: ack.ackType !== 'READ',
        userType: ack.user.studentProfile
          ? 'STUDENT'
          : ack.user.staffProfile
            ? 'STAFF'
            : 'USER',
        studentInfo: ack.user.studentProfile
          ? {
              admissionNo: ack.user.studentProfile.admissionNo,
              className: ack.user.studentProfile.Class?.name,
              sectionName: ack.user.studentProfile.Section?.name,
            }
          : null,
        staffInfo: ack.user.staffProfile
          ? {
              empCode: ack.user.staffProfile.empCode,
              designation: ack.user.staffProfile.designation,
              department: ack.user.staffProfile.department,
            }
          : null,
      }));
    } catch (error) {
      console.error('Error fetching read receipts:', error);
      return [];
    }
  }

  // Create audience for an announcement
  async createAnnouncementAudience(
    announcementId: number,
    audienceData: any[],
  ) {
    try {
      const audienceRows = audienceData.flatMap((audience) => {
        const { type, ids = [] } = audience;

        if (type === 'ALL' || type === 'ALL_SCHOOL') {
          return [{ announcementId, type: 'ALL_SCHOOL' }];
        }

        if (ids.length === 0) {
          return [{ announcementId, type }];
        }

        return ids.map((id: number) => {
          const base: any = { announcementId, type };

          switch (type) {
            case 'CLASS':
              base.classId = id;
              break;
            case 'SECTION':
              base.sectionId = id;
              break;
            case 'STUDENT':
              base.studentId = id;
              break;
            case 'STAFF':
              base.staffId = id;
              break;
            case 'ROLE':
              base.roleId = id;
              break;
          }

          return base;
        });
      });

      if (audienceRows.length > 0) {
        await this.prisma.announcementAudience.createMany({
          data: audienceRows,
          skipDuplicates: true,
        });
      }

      return true;
    } catch (error) {
      console.error('Error creating announcement audience:', error);
      throw error;
    }
  }

  // Update audience for an announcement
  async updateAnnouncementAudience(
    announcementId: number,
    audienceData: any[],
  ) {
    try {
      // Delete existing audience
      await this.prisma.announcementAudience.deleteMany({
        where: { announcementId },
      });

      // Create new audience
      await this.createAnnouncementAudience(announcementId, audienceData);

      return true;
    } catch (error) {
      console.error('Error updating announcement audience:', error);
      throw error;
    }
  }
}
