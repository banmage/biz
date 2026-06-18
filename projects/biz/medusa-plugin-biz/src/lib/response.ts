/**
 * 统一响应信封
 */

export interface SuccessResponse<T> {
  success: true;
  data: T;
  message: string;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export const successResponse = <T>(data: T, message = "操作成功"): SuccessResponse<T> => ({
  success: true,
  data,
  message,
});

export const errorResponse = (code: string, message: string): ErrorResponse => ({
  success: false,
  error: { code, message },
});
