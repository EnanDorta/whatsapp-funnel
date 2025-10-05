import { Status, FunnelStep } from '@prisma/client';

export interface ConversationUpdate {
  funnelStep?: FunnelStep;
  status?: Status;
  name?: string;
  birthDate?: Date;
  weightLossReason?: string;
  qualified?: boolean;
  lastActivity: Date;
}