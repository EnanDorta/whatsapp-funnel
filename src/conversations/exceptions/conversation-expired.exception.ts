import { HttpException, HttpStatus } from "@nestjs/common";

export class ConversationExpiredException extends HttpException {
  constructor() {
    super("Conversa expirada, por favor inicie novamente.", HttpStatus.GONE);
  }
}
