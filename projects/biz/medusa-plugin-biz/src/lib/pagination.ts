/**
 * 分页参数解析与响应工具
 */

export interface PaginationParams {
  limit: number;
  offset: number;
}

export interface PaginatedResponse<T> {
  rows: T[];
  total: number;
  limit: number;
  offset: number;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * 从请求查询参数中解析分页信息
 */
export const parsePagination = (query: Record<string, string | number | undefined>): PaginationParams => {
  const rawLimit = query.limit;
  const rawOffset = query.offset;

  let limit = DEFAULT_LIMIT;
  if (rawLimit !== undefined) {
    const parsed = typeof rawLimit === 'string' ? parseInt(rawLimit, 10) : rawLimit;
    if (!isNaN(parsed) && parsed > 0) {
      limit = Math.min(parsed, MAX_LIMIT);
    }
  }

  let offset = 0;
  if (rawOffset !== undefined) {
    const parsed = typeof rawOffset === 'string' ? parseInt(rawOffset, 10) : rawOffset;
    if (!isNaN(parsed) && parsed >= 0) {
      offset = parsed;
    }
  }

  return { limit, offset };
};

/**
 * 构造分页响应
 */
export const paginatedResponse = <T>(
  rows: T[],
  total: number,
  pagination: PaginationParams
): PaginatedResponse<T> => ({
  rows,
  total,
  limit: pagination.limit,
  offset: pagination.offset,
});
