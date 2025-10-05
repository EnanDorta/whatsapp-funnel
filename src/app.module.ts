import { Module } from '@nestjs/common';
import { ConversationsModule } from './conversations/conversations.module';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [PrismaModule, ConversationsModule],
  controllers: [HealthController],
})
export class AppModule {}