import { Controller, Get, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  me(@Req() req) {
    return this.users.getMe(req.user.id);
  }

  @Patch('me/profile')
  updateProfile(@Req() req, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(req.user.id, dto);
  }

  @Patch('me/preferences')
  updatePreferences(@Req() req, @Body() dto: UpdatePreferencesDto) {
    return this.users.updatePreferences(req.user.id, dto);
  }
}
