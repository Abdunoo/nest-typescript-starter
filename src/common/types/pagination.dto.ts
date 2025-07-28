import { Table } from 'drizzle-orm';
import { FilterOperator, FilterVariant } from './data-table';

export interface Filter {
  id: keyof Table;
  value: any;
  variant: FilterVariant;
  operator: FilterOperator;
  filterId?: string;
}

export interface Sort {
  id: string;
  desc: boolean;
}

export interface PaginationDto {
  page: number;
  perPage: number;
  filters?: Filter[]; // Changed from Filter to Filter[]
  joinOperator?: 'and' | 'or';
  sort?: Sort[];
}

export interface PaginationParams {
  page: number;
  perPage: number;
  filters?: Filter[];
  joinOperator?: 'and' | 'or';
  sort?: Sort[];
}
