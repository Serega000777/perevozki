export type Vehicle = { id: number; name: string; note?: string | null };
export type Category = { id: number; name: string };
export type Trip = {
  id: number;
  vehicleId: number;
  vehicle: Vehicle;
  date: string;
  destination: string;
  amount: number | string;
  mileage?: number | string | null;
  comment?: string | null;
  paid: boolean;
};
export type Expense = {
  id: number;
  vehicleId: number;
  vehicle: Vehicle;
  categoryId: number;
  category: Category;
  date: string;
  amount: number | string;
  comment?: string | null;
};
export type Analytics = {
  revenue: number;
  expenses: number;
  profit: number;
  unpaid: number;
  trips: number;
  byVehicle: { vehicleId: number; name: string; revenue: number; expenses: number; profit: number; unpaid: number; trips: number }[];
  tripRows: Trip[];
  expenseRows: Expense[];
};
