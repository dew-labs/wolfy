import { deposits, orders, positions, withdrawals } from "apps/backend/drizzle/schema";

export type OrderTable = typeof orders;
export type PositionTable = typeof positions;
export type DepositTable = typeof deposits;
export type WithdrawalTable = typeof withdrawals;
