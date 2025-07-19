import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        studyProfile: true,
        preferences: true,
      },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      studyProfile: user.studyProfile,
      preferences: user.preferences,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { studyProfile: true },
    });
    if (!existing) throw new NotFoundException('Usuário não encontrado');
    const data = {
      weakSubjects: dto.weakSubjects,
      strongSubjects: dto.strongSubjects,
      accuracy: dto.accuracy,
      xp: dto.xp,
      studyHabitScore: dto.studyHabitScore,
    };
    if (existing.studyProfile) {
      return this.prisma.userStudyProfile.update({ where: { userId }, data });
    }
    return this.prisma.userStudyProfile.create({ data: { userId, ...data } });
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { preferences: true },
    });
    if (!existing) throw new NotFoundException('Usuário não encontrado');
    const data = {
      preferredStudyMethod: dto.preferredStudyMethod,
      dailyGoal: dto.dailyGoal,
      preferredTimeOfDay: dto.preferredTimeOfDay,
    };
    if (existing.preferences) {
      return this.prisma.userPreferences.update({ where: { userId }, data });
    }
    return this.prisma.userPreferences.create({ data: { userId, ...data } });
  }
}
