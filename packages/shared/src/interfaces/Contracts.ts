import { WolfyContract } from "wolfy-sdk";

enum InternalWolfyContract {
    Pragma = "Pragma",
    IncreaseOrderUtils = "IncreaseOrderUtils",
    DecreaseOrderUtils = "DecreaseOrderUtils",
    SwapOrderUtils = "SwapOrderUtils",
    OrderUtils = "OrderUtils",
    OracleStore = "OracleStore",
    Oracle = "Oracle",
}

export type AllWolfyContract = WolfyContract | InternalWolfyContract;
export const AllWolfyContract = {
    ...WolfyContract,
    ...InternalWolfyContract,
};

export type Contracts = Partial<Record<AllWolfyContract, string | undefined>>;
