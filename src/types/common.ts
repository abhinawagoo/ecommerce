export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

export interface SearchParams {
  [key: string]: string | string[] | undefined;
}
