import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserSummary } from '@crucible/shared';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserSummary => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
