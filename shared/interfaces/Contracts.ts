import { SatoruContract } from "satoru-sdk";

enum InternalSatoruContract {
    Pragma = "Pragma",
    IncreaseOrderUtils = "IncreaseOrderUtils",
    DecreaseOrderUtils = "DecreaseOrderUtils",
    SwapOrderUtils = "SwapOrderUtils",
    OrderUtils = "OrderUtils",
    OracleStore = "OracleStore",
    Oracle = "Oracle",
}

export type AllSatoruContract = SatoruContract | InternalSatoruContract;
export const AllSatoruContract = {
    ...SatoruContract,
    ...InternalSatoruContract,
};

export type Contracts = Partial<Record<AllSatoruContract, string | undefined>>;
