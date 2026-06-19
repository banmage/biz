/**
 * 错误处理中间件
 */
import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { BizError, BizErrorCode } from '../../lib/biz-error-codes';

/**
 * 全局错误捕获中间件
 * 统一将各种错误转换为标准错误响应
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof BizError) {
    res.status(err.httpStatus).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: BizErrorCode.BIZ_VALIDATION_ERROR,
        message: err.issues.map((e: ZodError['issues'][0]) => `${e.path.join('.')}: ${e.message}`).join('; '),
      },
    });
    return;
  }

  // 未知错误
  const logger = (req as any).container?.resolve?.('logger');
  if (logger) {
    logger.error('Unhandled error', err);
  }

  res.status(500).json({
    success: false,
    error: {
      code: BizErrorCode.BIZ_INTERNAL_ERROR,
      message: '服务器内部错误',
    },
  });
};
