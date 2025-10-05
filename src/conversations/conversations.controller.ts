import { Controller, Post, Get, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { SendMessageDto } from './dto/send-message.dto';
import { ConversationStatusDto } from './dto/conversation-status.dto';
import { MessageResponseDto } from './dto/message-response.dto';

@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post(':phoneNumber/messages')
  @HttpCode(HttpStatus.OK)
  async sendMessage(
    @Param('phoneNumber') phoneNumber: string,
    @Body() sendMessageDto: SendMessageDto,
  ): Promise<MessageResponseDto> {
    return this.conversationsService.processMessage(phoneNumber, sendMessageDto.content);
  }

  @Get(':phoneNumber/status')
  async getStatus(@Param('phoneNumber') phoneNumber: string): Promise<ConversationStatusDto> {
    return this.conversationsService.getConversationStatus(phoneNumber);
  }
}