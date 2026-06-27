import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { dbStorage } from '../lib/dbStorage';
import { BudgetState } from '../types/budget';

interface BudgetStoreState extends BudgetState {
  // Actions
  setTotalBudget: (amount: number) => void;
  addExpense: (category: 'transport' | 'places' | 'hotel' | 'commute', amount: number) => void;
  refundExpense: (category: 'transport' | 'places' | 'hotel' | 'commute', amount: number) => void;
  recalcBudget: () => void;
  reset: () => void;
}

export const useBudgetStore = create<BudgetStoreState>()(
  persist(
    (set, get) => ({
  totalBudget: 0,
  spentTransport: 0,
  spentPlaces: 0,
  spentHotels: 0,
  spentCommute: 0,
  remaining: 0,
  projectedTotal: 0,

  setTotalBudget: (amount) => set((state) => {
    const remaining = amount - state.projectedTotal;
    return { totalBudget: amount, remaining };
  }),

  addExpense: (category, amount) => set((state) => {
    let key: keyof BudgetState;
    if (category === 'transport') key = 'spentTransport';
    else if (category === 'places') key = 'spentPlaces';
    else if (category === 'hotel') key = 'spentHotels';
    else key = 'spentCommute';

    const newSpent = state[key] + amount;
    return { [key]: newSpent };
  }),

  refundExpense: (category, amount) => set((state) => {
    let key: keyof BudgetState;
    if (category === 'transport') key = 'spentTransport';
    else if (category === 'places') key = 'spentPlaces';
    else if (category === 'hotel') key = 'spentHotels';
    else key = 'spentCommute';

    const newSpent = Math.max(0, state[key] - amount);
    return { [key]: newSpent };
  }),

  recalcBudget: () => set((state) => {
    const totalSpent = state.spentTransport + state.spentPlaces + state.spentHotels + state.spentCommute;
    const remaining = state.totalBudget - totalSpent;

    return {
      projectedTotal: totalSpent,
      remaining
    };
  }),

  reset: () => set({
    totalBudget: 0,
    spentTransport: 0,
    spentPlaces: 0,
    spentHotels: 0,
    spentCommute: 0,
    remaining: 0,
    projectedTotal: 0
  })
  }),
  {
    name: 'budget-store', // name of the item in the storage (must be unique)
    storage: createJSONStorage(() => dbStorage),
  }
));
