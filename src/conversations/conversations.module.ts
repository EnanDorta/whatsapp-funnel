import { Module } from '@nestjs/common';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { LangGraphService } from '../langgraph/langgraph.service';
import { PineconeService } from '../rag/pinecone.service';
import { OpenAIService } from '../openai/openai.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ConversationsController],
  providers: [ConversationsService, LangGraphService, PineconeService, OpenAIService],
  exports: [ConversationsService],
})
export class ConversationsModule {}