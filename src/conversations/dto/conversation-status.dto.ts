export class ConversationStatusDto {
  phoneNumber!: string;
  status!: 'active' | 'expired' | 'qualified' | 'rejected' | 'not_found';
  funnelStep?: 'collect_name' | 'collect_birth_date' | 'collect_weight_loss_reason' | 'qualified' | 'rejected';
  variables!: {
    name?: string;
    birthDate?: string;
    weightLossReason?: string;
  };
}
