import { createSatoruContract, SatoruContract } from "node_modules/satoru-sdk/dist/contracts";
import { getCompiledSierra, getContracts, settingUp } from "../../utils";
import {
    Account,
    Contract,
    json,
    Calldata,
    CallData,
    RpcProvider,
    shortString,
    CairoUint256,
    CairoCustomEnum,
    ec,
} from "starknet";
import OrderHandlerABI from "artifacts/OrderHandlerABI";
import RoleStoreABI from "node_modules/satoru-sdk/dist/abis/RoleStoreABI";
import { createCall } from "satoru-sdk";

async function create_market() {
    const { account, chainId } = await settingUp();
    const contracts = getContracts();

    const marketTokenAddress = "0x4b3bd2fe7f3dd02a6a143a3040ede80048388e0cf1c20dc748d6a6d6fa93069";
    const eth: string = "0x75acffcc1c3661fe1cfbb6d2c444355ef01e85a40e65962a4d9a2ac38903934";
    const usdc: string = "0x70d22d4962de09d9ec0a590e9ff33a496425277235890575457f9582d837964";

    const compiledOrderHandlerSierra = getCompiledSierra("OrderHandler");

    const orderHandlerContract = createSatoruContract(
        chainId,
        SatoruContract.OrderHandler,
        OrderHandlerABI,
        account
    );

    const roleStoreContract = createSatoruContract(
        chainId,
        SatoruContract.RoleStore,
        RoleStoreABI,
        account
    );

    console.log("Roles granted.");

    const setPricesParams = {
        signer_info: 1,
        tokens: [
            "0x4b76dd1e0a8d0bc196aa75d7a85a6cc81cf7bc8e0cd2e5061237477eb2c109a",
            "0x6b6f734dca33adeb315c1ff399886b577bc3f2b51165af9277ca0096847d267",
        ],
        compacted_min_oracle_block_numbers: [63970, 63970],
        compacted_max_oracle_block_numbers: [1000000, 1000000],
        compacted_oracle_timestamps: [171119803, 10],
        compacted_decimals: [1, 1],
        compacted_min_prices: [2147483648010000], // 500000, 10000 compacted
        compacted_min_prices_indexes: [0],
        compacted_max_prices: [2147483648010000], // 500000, 10000 compacted
        compacted_max_prices_indexes: [0],
        signatures: [
            ["signatures1", "signatures2"],
            ["signatures1", "signatures2"],
        ],
        price_feed_tokens: [],
    };

    let key = "0x5dabb2c7c283c2b4759e3e8e38131a9f825decf26bd73a2e720c02222fa3c2f";
    const executeOrderCall = createCall(orderHandlerContract, "execute_order_keeper", [
        key,
        setPricesParams,
        account.address,
    ]);
    let tx = await orderHandlerContract.execute_order_keeper(executeOrderCall.calldata);
}

create_market();
