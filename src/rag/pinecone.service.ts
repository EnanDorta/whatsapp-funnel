import { Injectable, OnModuleInit } from "@nestjs/common";
import { Pinecone } from "@pinecone-database/pinecone";
import { OpenAIService } from "../openai/openai.service";

@Injectable()
export class PineconeService implements OnModuleInit {
  private pinecone: Pinecone;
  private indexName: string;

  constructor(private openAIService: OpenAIService) {
    this.indexName = process.env.PINECONE_INDEX_NAME || "weight-loss-reasons";
  }

  async onModuleInit() {
    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });

    await this.ensureIndexExists();
    await this.seedQualifiedReasons();
  }

  private async ensureIndexExists() {
    try {
      await this.pinecone.describeIndex(this.indexName);
      console.log(`Pinecone index '${this.indexName}' exists`);
    } catch (error) {
      console.log(`Creating Pinecone index '${this.indexName}'...`);
      await this.pinecone.createIndex({
        name: this.indexName,
        dimension: 1536, // OpenAI ada-002 embedding dimension
        metric: "cosine",
        spec: {
          serverless: {
            cloud: "aws",
            region: "us-east-1",
          },
        },
      });

      // Wait for index to be ready
      await new Promise((resolve) => setTimeout(resolve, 10000));
      console.log(`Pinecone index '${this.indexName}' created`);
    }
  }

  async calculateSimilarity(reason: string): Promise<number> {
    try {
      const embedding = await this.openAIService.createEmbedding(reason);
      const index = this.pinecone.index(this.indexName);

      const queryResponse = await index.query({
        vector: embedding,
        topK: 1,
        includeMetadata: true,
      });

      const match = queryResponse.matches[0];
      if (!match) return 0;
      
      // Se encontrou match com motivo rejeitado, retorna score baixo
      if (match.metadata?.qualified === false) {
        return 0.2;
      }
      
      // Se encontrou match com motivo qualificado, retorna o score
      return match.score || 0;
    } catch (error) {
      console.error("Pinecone similarity error:", error);
      return this.fallbackSimilarity(reason);
    }
  }

  private async seedQualifiedReasons() {
    const qualifiedReasons = [
      "Preciso fazer cirurgia e o médico exigiu perder peso",
      "Minha saúde está em risco, pressão alta e diabetes",
      "Quero engravidar mas o médico disse que preciso emagrecer",
      "Tenho dor nas articulações por causa do peso",
      "Meu colesterol está altíssimo e estou com medo de infarto",
    ];
    
    const rejectedReasons = [
      "Quero ficar mais bonita pro verão",
      "Quero usar biquini na praia",
      "Quero ficar magra para as fotos",
      "Quero um corpo perfeito",
      "Quero impressionar meu namorado"
    ];

    try {
      const index = this.pinecone.index(this.indexName);
      const vectors = [];

      // Seed qualified reasons
      for (let i = 0; i < qualifiedReasons.length; i++) {
        const embedding = await this.openAIService.createEmbedding(
          qualifiedReasons[i]
        );
        vectors.push({
          id: `qualified-${i}`,
          values: embedding,
          metadata: { reason: qualifiedReasons[i], qualified: true },
        });
      }
      
      // Seed rejected reasons
      for (let i = 0; i < rejectedReasons.length; i++) {
        const embedding = await this.openAIService.createEmbedding(
          rejectedReasons[i]
        );
        vectors.push({
          id: `rejected-${i}`,
          values: embedding,
          metadata: { reason: rejectedReasons[i], qualified: false },
        });
      }

      await index.upsert(vectors);
      console.log("Pinecone seeded with qualified and rejected reasons");
    } catch (error) {
      console.error("Error seeding Pinecone:", error);
    }
  }

  private fallbackSimilarity(reason: string): number {
    const lowerReason = reason.toLowerCase();
    
    // Motivos estéticos (REJEITADOS)
    const aestheticKeywords = [
      'bonit', 'verão', 'praia', 'biquini', 'roupa', 'vestido', 'aparencia',
      'aparência', 'beleza', 'magr', 'secar', 'definir', 'corpo', 'barriga',
      'perna', 'braço', 'selfie', 'foto', 'instagram', 'namor', 'paquera'
    ];
    
    // Motivos de saúde (QUALIFICADOS)
    const healthKeywords = [
      'médico', 'cirurgia', 'saúde', 'diabetes', 'pressão', 'colesterol',
      'articulações', 'dor', 'engravidar', 'infarto', 'risco', 'doença',
      'problema', 'exame', 'tratamento', 'remédio', 'hospital'
    ];
    
    const hasAestheticKeywords = aestheticKeywords.some(keyword => 
      lowerReason.includes(keyword)
    );
    
    const hasHealthKeywords = healthKeywords.some(keyword => 
      lowerReason.includes(keyword)
    );
    
    // Se tem palavras estéticas, rejeita
    if (hasAestheticKeywords) {
      return 0.2;
    }
    
    // Se tem palavras de saúde, qualifica
    if (hasHealthKeywords) {
      return 0.8;
    }
    
    // Caso neutro, rejeita por segurança
    return 0.3;
  }
}
