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
        account,
        createCall(dataStoreContract, "set_address", [getKey("FEE_TOKEN"), feeToken])
    );

    // set max swap path length
    await executeAndWait(
        account,
        createCall(dataStoreContract, "set_u256", [getKey("MAX_SWAP_PATH_LENGTH"), 5])
    );

    console.log("Done config");
}

config();
