import { Controller, Get } from '@nestjs/common';
import { AudienceService } from './audience.service';

@Controller('audience')
export class AudienceController {
  constructor(private readonly audienceService: AudienceService) {}

  @Get('options')
  async getAudienceOptions() {
    return this.audienceService.getAudienceOptions();
  }

  @Get('classes')
  async getClasses() {
    return this.audienceService.getClasses();
  }

  @Get('sections')
  async getSections() {
    return this.audienceService.getSections();
  }

  @Get('students')
  async getStudents() {
    return this.audienceService.getStudents();
  }

  @Get('staff')
  async getStaff() {
    return this.audienceService.getStaff();
  }

  @Get('roles')
  async getRoles() {
    return this.audienceService.getRoles();
  }

  @Get('users')
  async getUsers() {
    return this.audienceService.getUsers();
  }
}
