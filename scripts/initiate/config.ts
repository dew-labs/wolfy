import {
    createCall,
    createSatoruContract,
    DataStoreABI,
    executeAndWait,
    SatoruContract,
} from "satoru-sdk";

import { getKey, settingUp } from "../utils";

async function config() {
    const { account, chainId, feeToken } = await settingUp();

    const dataStoreContract = createSatoruContract(chainId, SatoruContract.DataStore, DataStoreABI);

    // set fee token
    await executeAndWait(
        chainId,
        createCall(dataStoreContract, "set_address", [getKey("FEE_TOKEN"), feeToken]),
        account
    );

    // set max swap path length
    await executeAndWait(
        chainId,
        createCall(dataStoreContract, "set_u256", [getKey("MAX_SWAP_PATH_LENGTH"), 5]),
        account
    );
}

config();
