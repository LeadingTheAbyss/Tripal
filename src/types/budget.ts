export type BudgetState = {
  totalBudget: number;
  spentTransport: number;
  spentPlaces: number;
  spentHotels: number;
  spentCommute: number;
  spentFood: number;
  remaining: number;
  projectedTotal: number;
};

export type BudgetWarning = {
  level: 'info' | 'warning' | 'critical';
  message: string;
};
