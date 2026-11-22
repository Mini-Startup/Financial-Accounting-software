export interface ExpiryDateDTO {
  id: string;
  date: string;
  normalizedDate: Date;
  isDeleted: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateExpiryDateInput {
  date: string;
  normalizedDate?: string | Date;
}

export interface UpdateExpiryDateInput {
  date?: string;
  normalizedDate?: string | Date;
}

export interface ExpiryDateFilter {
  minDate?: string;
  activeOnly?: boolean;
  includeDeleted?: boolean;
}
