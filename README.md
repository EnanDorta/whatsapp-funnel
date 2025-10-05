# 🏥 WhatsApp Funnel API

API NestJS inteligente para gerenciar funil de atendimento via WhatsApp com integração OpenAI e Pinecone para qualificação automática de leads de clínicas de emagrecimento.

## 🚀 Tecnologias

- **NestJS** + TypeScript
- **PostgreSQL** (Docker Compose)
- **Prisma ORM**
- **OpenAI GPT-4.1-nano** (Conversação)
- **OpenAI Embeddings** (Vetorização)
- **Pinecone** (Busca por similaridade)

## 🎯 Funcionalidades

### 🤖 **IA Conversacional**

- Respostas contextuais geradas por OpenAI
- Detecção automática de saudações vs informações
- Progressão inteligente no funil de vendas

### 📊 **Funil Automatizado**

1. **Coleta Nome** - Detecta saudações e solicita identificação
2. **Coleta Data Nascimento** - Valida formato DD/MM/AAAA
3. **Coleta Motivo** - Analisa razão para emagrecimento
4. **Qualificação** - IA decide se aceita ou rejeita o lead

### 🎯 **Qualificação Inteligente**

- **Motivos de Saúde** → QUALIFICADO (cirurgia, diabetes, pressão, etc.)
- **Motivos Estéticos** → REJEITADO (verão, beleza, fotos, etc.)
- **RAG com Pinecone** para análise semântica avançada

### ⏰ **Gestão de Sessão**

- Expiração automática em 15 minutos
- Continuidade de conversas existentes
- Controle de status (active, expired, qualified, rejected)

## 🏗️ Arquitetura

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────┐
│   WhatsApp      │───▶│  NestJS API  │───▶│ PostgreSQL  │
│   Messages      │    │              │    │  Database   │
└─────────────────┘    └──────────────┘    └─────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   LangGraph      │
                    │   Agent          │
                    └──────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
            ┌──────────────┐    ┌──────────────┐
            │   OpenAI     │    │   Pinecone   │
            │   GPT-4.1    │    │   Vector DB  │
            └──────────────┘    └──────────────┘
```

## 📋 Modelos de Dados

### Conversation

```typescript
{
  phoneNumber: string;        // Único por usuário
  status: 'active' | 'expired' | 'qualified' | 'rejected';
  funnelStep: 'collect_name' | 'collect_birth_date' | 'collect_weight_loss_reason' | 'qualified' | 'rejected';
  name?: string;
  birthDate?: Date;
  weightLossReason?: string;
  qualified?: boolean;
  lastActivity: Date;         // Para controle de expiração
}
```

### Message

```typescript
{
  conversationId: string;
  role: "USER" | "AI";
  content: string;
  timestamp: Date;
}
```

## 🛠️ Setup

### 1. **Clonar e Instalar**

```bash
git clone <repo>
cd whatsapp-funnel-api
yarn install
```

### 2. **Configurar Ambiente**

```bash
cp .env.example .env
# Editar .env com suas chaves:
# - OPENAI_API_KEY
# - PINECONE_API_KEY
# - DATABASE_URL
# - PORT (opcional, padrão: 3000)
```

### 3. **Iniciar PostgreSQL**

```bash
docker-compose up -d
```

### 4. **Configurar Banco**

```bash
npx prisma migrate dev
npx prisma generate
```

### 5. **Iniciar Aplicação**

```bash
yarn dev
```

## 🔌 API Endpoints

### **POST** `/conversations/:phoneNumber/messages`

Enviar mensagem no funil

**Request:**

```json
{
  "content": "Oi, bom dia!"
}
```

**Response:**

```json
{
  "type": "text",
  "content": "Olá! Bem-vindo à clínica. Qual é o seu nome?",
  "conversation": {
    "phoneNumber": "5511999999999",
    "status": "active",
    "funnelStep": "collect_name",
    "variables": {
      "name": null,
      "birthDate": null,
      "weightLossReason": null
    }
  }
}
```

### **GET** `/conversations/:phoneNumber/status`

Consultar status da conversa

**Response:**

```json
{
  "phoneNumber": "5511999999999",
  "status": "qualified",
  "funnelStep": "qualified",
  "variables": {
    "name": "Maria Silva",
    "birthDate": "1990-03-15",
    "weightLossReason": "Preciso fazer cirurgia e médico exigiu"
  }
}
```

### **GET** `/health`

Health check da aplicação

## 🎭 Fluxo de Exemplo

### **Conversa Qualificada (Motivo de Saúde)**

```
👤 Cliente: "Oi"
🤖 IA: "Olá! Bem-vindo à clínica. Qual é o seu nome?"

👤 Cliente: "Maria"
🤖 IA: "Prazer, Maria! Qual é a sua data de nascimento no formato DD/MM/AAAA?"

👤 Cliente: "15/03/1990"
🤖 IA: "Obrigada! Qual o principal motivo que te faz querer emagrecer?"

👤 Cliente: "Meu médico disse que preciso perder peso para fazer cirurgia"
🤖 IA: "Entendo, Maria. Sua saúde é prioridade! Vamos agendar uma avaliação gratuita."
📊 Status: QUALIFIED
```

### **Conversa Rejeitada (Motivo Estético)**

```
👤 Cliente: "Quero ficar bonita para o verão"
🤖 IA: "Obrigada pelo contato, Maria! Infelizmente não conseguimos atender sua necessidade no momento."
📊 Status: REJECTED
```

## 🧠 Inteligência Artificial

### **OpenAI Integration**

- **Modelo**: GPT-4.1-nano para conversação
- **Embeddings**: text-embedding-ada-002 para vetorização
- **Prompts**: Específicos para cada etapa do funil
- **Contexto**: Histórico da conversa passado para IA

### **Pinecone RAG**

- **Índice**: weight-loss-reasons
- **Dimensão**: 1536 (OpenAI embeddings)
- **Métrica**: Cosine similarity
- **Seed**: 5 motivos qualificados + 5 rejeitados

### **Qualificação Automática**

```typescript
// Motivos QUALIFICADOS (score > 0.7)
-"Preciso fazer cirurgia e médico exigiu" -
  "Pressão alta e diabetes" -
  "Dor nas articulações" -
  "Colesterol alto" -
  "Quero engravidar" -
  // Motivos REJEITADOS (score < 0.7)
  "Ficar bonita para o verão" -
  "Usar biquini na praia" -
  "Corpo perfeito" -
  "Impressionar namorado";
```

## 🔧 Scripts Disponíveis

```bash
yarn dev          # Desenvolvimento com hot reload
yarn build        # Build para produção
yarn start        # Iniciar aplicação
yarn db:migrate   # Executar migrações
yarn db:generate  # Gerar Prisma Client
yarn db:studio    # Interface visual do banco
```
