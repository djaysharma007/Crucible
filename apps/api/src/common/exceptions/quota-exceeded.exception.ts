import { HttpException, HttpStatus } from '@nestjs/common';

export class QuotaExceededException extends HttpException {
  constructor(
    message = 'Daily code execution quota reached on the free tier. Try again tomorrow or run locally using Docker.',
  ) {
    super(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        error: 'QUOTA_EXCEEDED',
        message,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
