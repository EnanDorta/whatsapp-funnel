import { Injectable } from "@nestjs/common";
import { PineconeService } from "../rag/pinecone.service";
import { OpenAIService } from "../openai/openai.service";
import { Status, FunnelStep } from "@prisma/client";

interface ProcessMessageResponse {
  content: string;
  updateConversation?: {
    funnelStep?: FunnelStep;
    status?: Status;
    name?: string;
    birthDate?: Date;
    weightLossReason?: string;
    qualified?: boolean;
    lastActivity: Date;
  };
}

@Injectable()
export class LangGraphService {
  constructor(
    private pineconeService: PineconeService,
    private openAIService: OpenAIService
  ) {}

  async processMessage(
    conversation: any,
    messageContent: string,
    isNewConversation: boolean = false
  ): Promise<ProcessMessageResponse> {
    // If it's a new conversation and user is greeting, show welcome message
    if (isNewConversation && this.isGreeting(messageContent)) {
      return {
        content: "Olá! Bem-vindo à clínica. Qual é o seu nome?",
        updateConversation: {
          lastActivity: new Date(),
        },
      };
    }

    const aiContent = await this.openAIService.generateResponse(
      conversation,
      messageContent
    );

    const response: ProcessMessageResponse = {
      content: aiContent,
      updateConversation: {
        lastActivity: new Date(),
      },
    };

    // Funnel progression logic
    if (conversation.funnelStep === FunnelStep.collect_name) {
      if (this.isGreeting(messageContent)) {
        response.content = await this.openAIService.generateResponse(
          conversation,
          messageContent
        );
      } else {
        response.updateConversation.name = messageContent;
        response.updateConversation.funnelStep = FunnelStep.collect_birth_date;
      }
    } else if (conversation.funnelStep === FunnelStep.collect_birth_date) {
      const birthDate = this.parseDate(messageContent);
      if (birthDate) {
        response.updateConversation.birthDate = birthDate;
        response.updateConversation.funnelStep =
          FunnelStep.collect_weight_loss_reason;
      } else {
        response.content =
          "Por favor, informe uma data válida no formato DD/MM/AAAA.";
      }
    } else if (
      conversation.funnelStep === FunnelStep.collect_weight_loss_reason
    ) {
      const similarity = await this.pineconeService.calculateSimilarity(
        messageContent
      );
      response.updateConversation.weightLossReason = messageContent;
      response.updateConversation.qualified = similarity > 0.7;
      response.updateConversation.funnelStep =
        similarity > 0.7 ? FunnelStep.qualified : FunnelStep.rejected;
      response.updateConversation.status =
        similarity > 0.7 ? Status.qualified : Status.rejected;

      // Generate final response based on qualification
      const finalStep =
        similarity > 0.7 ? FunnelStep.qualified : FunnelStep.rejected;
      response.content = await this.openAIService.generateResponse(
        { ...conversation, funnelStep: finalStep },
        messageContent
      );
    }

    return response;
  }

  private parseDate(dateString: string): Date | null {
    const ddmmyyyyRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = dateString.match(ddmmyyyyRegex);
    if (match) {
      const [, day, month, year] = match;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    return null;
  }

  private isGreeting(message: string): boolean {
    const greetings = [
      "oi",
      "olá",
      "ola",
      "bom dia",
      "boa tarde",
      "boa noite",
      "hey",
      "e ai",
      "e aí",
      "salve",
      "fala",
      "opa",
      "eae",
    ];

    const lowerMessage = message.toLowerCase().trim();
    return greetings.some(
      (greeting) =>
        lowerMessage === greeting ||
        lowerMessage.startsWith(greeting + " ") ||
        lowerMessage.startsWith(greeting + ",")
    );
  }
}
