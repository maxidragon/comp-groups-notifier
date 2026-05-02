import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

interface WcaUserData {
  wcaUserId: number;
  fullName: string;
  avatarUrl?: string;
  wcaAccessToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async findOrCreateUser(data: WcaUserData) {
    const existing = await this.prisma.user.findUnique({
      where: { wcaUserId: data.wcaUserId },
    });

    if (existing) {
      return this.prisma.user.update({
        where: { id: existing.id },
        data: {
          fullName: data.fullName,
          avatarUrl: data.avatarUrl,
          wcaAccessToken: data.wcaAccessToken,
        },
      });
    }

    return this.prisma.user.create({
      data: {
        wcaUserId: data.wcaUserId,
        fullName: data.fullName,
        avatarUrl: data.avatarUrl,
        wcaAccessToken: data.wcaAccessToken,
      },
    });
  }

  generateJwt(user: { id: string; wcaUserId: number }) {
    return this.jwtService.sign({
      sub: user.id,
      wcaUserId: user.wcaUserId,
    });
  }

  async getMe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        wcaUserId: true,
        avatarUrl: true,
        createdAt: true,
      },
    });
  }
}
