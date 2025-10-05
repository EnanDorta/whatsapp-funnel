import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LangGraphService } from '../langgraph/langgraph.service';
import { Status } from '@prisma/client';
import { ConversationStatusDto } from './dto/conversation-status.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import { ConversationUpdate } from './interfaces/conversation-update.interface';
import { CONVERSATION_CONSTANTS } from './constants/conversation.constants';
import { ConversationExpiredException } from './exceptions/conversation-expired.exception';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly langGraphService: LangGraphService,
  ) {}

  /**
   * Processes incoming WhatsApp message through funnel pipeline
   * @param phoneNumber - User's phone number identifier
   * @param content - Message content from user
   * @returns Formatted response with AI content and conversation state
   */
  async processMessage(phoneNumber: string, content: string): Promise<MessageResponseDto> {
    try {
      const existingConversation = await this.prisma.conversation.findUnique({
        where: { phoneNumber },
      });
      
      const isNewConversation = !existingConversation;
      let conversation = existingConversation || await this.createConversation(phoneNumber);

      if (existingConversation) {
        this.validateConversationNotExpired(conversation);
      }

      await this.saveUserMessage(conversation.id, content);
      const aiResponse = await this.processWithAI(conversation, content, isNewConversation);
      await this.saveAIMessage(conversation.id, aiResponse.content);

      if (aiResponse.updateConversation) {
        conversation = await this.updateConversationIfNeeded(
          conversation,
          aiResponse.updateConversation,
        );
      }

      return this.buildMessageResponse(conversation, aiResponse.content);
    } catch (error) {
      this.logger.error(`Failed to process message for ${phoneNumber}`, error.stack);
      throw error;
    }
  }

  /**
   * Retrieves current conversation status and collected variables
   * @param phoneNumber - User's phone number identifier
   * @returns Current conversation state or not_found status
   */
  async getConversationStatus(phoneNumber: string): Promise<ConversationStatusDto> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { phoneNumber },
    });

    if (!conversation) {
      return {
        phoneNumber,
        status: "not_found",
        variables: {},
      };
    }

    return {
      phoneNumber: conversation.phoneNumber,
      status: conversation.status,
      funnelStep: conversation.funnelStep,
      variables: {
        name: conversation.name,
        birthDate: conversation.birthDate
          ? conversation.birthDate.toISOString().split("T")[0]
          : undefined,
        weightLossReason: conversation.weightLossReason,
      },
    };
  }



  private async createConversation(phoneNumber: string) {
    return this.prisma.conversation.create({
      data: { phoneNumber },
    });
  }

  private validateConversationNotExpired(conversation: any): void {
    if (this.isExpired(conversation.lastActivity)) {
      throw new ConversationExpiredException();
    }
  }

  /**
   * Checks if conversation has exceeded session timeout
   */
  private isExpired(lastActivity: Date): boolean {
    const now = new Date();
    const diffMinutes = (now.getTime() - lastActivity.getTime()) / (1000 * 60);
    return diffMinutes > CONVERSATION_CONSTANTS.SESSION_TIMEOUT_MINUTES;
  }

  private async saveUserMessage(conversationId: string, content: string) {
    return this.saveMessage(conversationId, 'USER', content);
  }

  private async saveAIMessage(conversationId: string, content: string) {
    return this.saveMessage(conversationId, 'AI', content);
  }

  private async saveMessage(conversationId: string, role: 'USER' | 'AI', content: string) {
    return this.prisma.message.create({
      data: { conversationId, role, content },
    });
  }

  private async processWithAI(conversation: any, content: string, isNewConversation: boolean) {
    return this.langGraphService.processMessage(conversation, content, isNewConversation);
  }

  private async updateConversationIfNeeded(
    conversation: any,
    updates?: ConversationUpdate,
  ) {
    if (!updates) return conversation;

    return this.prisma.conversation.update({
      where: { id: conversation.id },
      data: updates,
    });
  }

  private buildMessageResponse(conversation: any, content: string): MessageResponseDto {
    return {
      type: 'text',
      content,
      conversation: {
        phoneNumber: conversation.phoneNumber,
        status: conversation.status,
        funnelStep: conversation.funnelStep,
        variables: {
          name: conversation.name,
          birthDate: this.formatBirthDate(conversation.birthDate),
          weightLossReason: conversation.weightLossReason,
        },
      },
    };
  }

  /**
   * Formats date to ISO string for API response
   */
  private formatBirthDate(birthDate?: Date): string | undefined {
    return birthDate ? birthDate.toISOString().split('T')[0] : undefined;
  }
}
