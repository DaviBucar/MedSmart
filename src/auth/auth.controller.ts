// src/auth/auth.controller.ts
import { Controller, Post, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { LocalAuthGuard } from './local-auth.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Public } from './public.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {
    console.log('🎯 AuthController inicializado');
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto) {
    console.log('🔥 CHEGOU NO CONTROLLER REGISTER!');
    console.log('📝 Dados recebidos:', dto);
    console.log('📝 Tipo dos dados:', typeof dto);
    console.log('📝 Keys:', Object.keys(dto || {}));
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    console.log('🔥 CHEGOU NO CONTROLLER LOGIN!');
    return this.authService.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Request() req) {
    const payload = { sub: req.user.id, role: req.user.role };
    const token = this.authService['jwtService'].sign(payload);
    
    // Buscar dados atualizados do usuário
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true }
    });
    
    return { 
      token,
      user
    };
  }
}
