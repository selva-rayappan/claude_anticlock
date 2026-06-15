import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.status < 500) return false;
          return failureCount < 2;
        },
      },
      mutations: {
        onError: (error) => {
          if (error instanceof ApiError && error.status === 401) {
            window.location.href = '/login';
          }
        },
      },
    },
  });
}
