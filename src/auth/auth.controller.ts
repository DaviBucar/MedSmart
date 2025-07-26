// src/auth/auth.controller.ts
import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { LocalAuthGuard } from './local-auth.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Public } from './public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {
    console.log('🎯 AuthController inicializado');
  }

  @Post('register')
  register(@Body() dto: RegisterDto) {
    console.log('🔥 CHEGOU NO CONTROLLER REGISTER!');
    console.log('📝 Dados recebidos:', dto);
    console.log('📝 Tipo dos dados:', typeof dto);
    console.log('📝 Keys:', Object.keys(dto || {}));
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    console.log('🔥 CHEGOU NO CONTROLLER LOGIN!');
    return this.authService.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('refresh')
  refresh(@Request() req) {
    const payload = { sub: req.user.id, role: req.user.role };
    return { accessToken: this.authService['jwtService'].sign(payload) };
  }
}
