import { getCompiledSierra, getContracts, settingUp } from "../../utils";
import {
    Account,
    Contract,
    json,
    Calldata,
    CallData,
    RpcProvider,
    shortString,
    uint256,
    CairoCustomEnum,
    ec,
} from "starknet";

async function create_market() {
    const { account } = await settingUp();
    const contracts = getContracts();

    const marketTokenAddress = "0x4b3bd2fe7f3dd02a6a143a3040ede80048388e0cf1c20dc748d6a6d6fa93069";
    const eth: string = "0x75acffcc1c3661fe1cfbb6d2c444355ef01e85a40e65962a4d9a2ac38903934";
    const usdc: string = "0x70d22d4962de09d9ec0a590e9ff33a496425277235890575457f9582d837964";

    const compiledOrderHandlerSierra = getCompiledSierra("OrderHandler");

    const orderHandlerContract = new Contract(
        compiledOrderHandlerSierra.abi,
        contracts.ORDER_HANDLER as string,
        account
    );

    const compiledRoleStoreSierra = getCompiledSierra("RoleStore");
    const roleStoreContract = new Contract(
        compiledRoleStoreSierra.abi,
        contracts.ROLE_STORE as string,
        account
    );

    console.log("Granting roles...");
    const roleCall2 = roleStoreContract.populate("grant_role", [
        account.address as string,
        shortString.encodeShortString("ORDER_KEEPER"),
    ]);
    const grant_role_tx2 = await roleStoreContract.grant_role(roleCall2.calldata);
    await account.waitForTransaction(grant_role_tx2.transaction_hash);
    const roleCall3 = roleStoreContract.populate("grant_role", [
        "0x04b79329e9b295a50a27533d52484e0e3eb36a7f3303274745b6fe0e5dce7cc3" as string,
        shortString.encodeShortString("CONTROLLER"),
    ]);
    const grant_role_tx3 = await roleStoreContract.grant_role(roleCall3.calldata);
    await account.waitForTransaction(grant_role_tx3.transaction_hash);

    console.log("Roles granted.");

    const setPricesParams = {
        signer_info: 1,
        tokens: [
            "0x4b76dd1e0a8d0bc196aa75d7a85a6cc81cf7bc8e0cd2e5061237477eb2c109a",
            "0x6b6f734dca33adeb315c1ff399886b577bc3f2b51165af9277ca0096847d267",
        ],
        compacted_min_oracle_block_numbers: [63970, 63970],
        compacted_max_oracle_block_numbers: [64901, 64901],
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
    const executeOrderCall = orderHandlerContract.populate("execute_order_keeper", [
        key,
        setPricesParams,
        account.address,
    ]);
    let tx = await orderHandlerContract.execute_order_keeper(executeOrderCall.calldata);
}

create_market();
