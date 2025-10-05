import { Injectable } from "@nestjs/common";
import OpenAI from "openai";
import { FunnelStep } from "@prisma/client";

@Injectable()
export class OpenAIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async createEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: text,
    });

    return response.data[0].embedding;
  }

  async generateResponse(
    conversation: any,
    userMessage: string
  ): Promise<string> {
    const systemPrompt = this.getSystemPrompt(conversation.funnelStep);
    const conversationContext = this.buildConversationContext(conversation);

    const completion = await this.openai.chat.completions.create({
      model: "gpt-4.1-nano",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `${conversationContext}\n\nUsuário: ${userMessage}`,
        },
      ],
      temperature: 0.7,
      max_completion_tokens: 150,
    });

    return (
      completion.choices[0]?.message?.content ||
      "Desculpe, não consegui processar sua mensagem."
    );
  }

  private getSystemPrompt(funnelStep: FunnelStep): string {
    switch (funnelStep) {
      case FunnelStep.collect_name:
        return "Você é um atendente de clínica de emagrecimento. O usuário acabou de se apresentar com o nome. Responda EXATAMENTE: 'Prazer, [NOME]! Qual é a sua data de nascimento no formato DD/MM/AAAA?' - Substitua [NOME] pelo nome informado.";

      case FunnelStep.collect_birth_date:
        return "Você é um atendente de clínica de emagrecimento. O usuário informou a data de nascimento. Responda EXATAMENTE: 'Obrigada! Qual o principal motivo que te faz querer emagrecer?'";

      case FunnelStep.collect_weight_loss_reason:
        return "Você é um atendente de clínica de emagrecimento. O usuário informou o motivo para emagrecer. Agradeça pela informação de forma empática e breve.";

      case FunnelStep.qualified:
        return "Você é um atendente de clínica de emagrecimento. O lead foi QUALIFICADO por motivo de saúde. Responda EXATAMENTE: 'Entendo, [NOME]. Sua saúde é prioridade! Vamos agendar uma avaliação gratuita.' - Substitua [NOME] pelo nome da pessoa.";

      case FunnelStep.rejected:
        return "Você é um atendente de clínica de emagrecimento. O lead foi REJEITADO por motivo estético. Responda EXATAMENTE: 'Obrigada pelo contato, [NOME]! Infelizmente não conseguimos atender sua necessidade no momento.' - Substitua [NOME] pelo nome da pessoa.";

      default:
        return "Você é um atendente de clínica de emagrecimento. Responda EXATAMENTE: 'Olá! Bem-vindo à clínica. Qual é o seu nome?'";
    }
  }

  private buildConversationContext(conversation: any): string {
    let context = "Contexto da conversa:\n";

    if (conversation.name) {
      context += `Nome: ${conversation.name}\n`;
    }

    if (conversation.birthDate) {
      context += `Data de nascimento: ${conversation.birthDate.toLocaleDateString(
        "pt-BR"
      )}\n`;
    }

    if (conversation.weightLossReason) {
      context += `Motivo para emagrecer: ${conversation.weightLossReason}\n`;
    }

    return context;
  }
}
