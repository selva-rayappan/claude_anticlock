export interface ApiResponse<T> {
  data: T;
  meta?: {
    nextCursor?: string;
    prevCursor?: string;
    total?: number;
    page?: number;
    pageSize?: number;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
  traceId?: string;
}

export interface ApiErrorResponse {
  error: ApiError;
}

export interface PaginationParams {
  cursor?: string;
  limit?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface BulkResponse<T> {
  succeeded: T[];
  failed: Array<{ index: number; error: string; data: unknown }>;
  total: number;
  successCount: number;
  failureCount: number;
}

export interface DuplicateWarning {
  type: 'DUPLICATE';
  matchId: string;
  matchName: string;
  matchField: string;
}
