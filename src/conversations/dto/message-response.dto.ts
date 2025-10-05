export class MessageResponseDto {
  type: string;
  content: string;
  conversation: {
    phoneNumber: string;
    status: string;
    funnelStep: string;
    variables: {
      name?: string;
      birthDate?: string;
      weightLossReason?: string;
    };
  };
}