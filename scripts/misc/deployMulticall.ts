import { settingUp } from "packages/shared/src/utils";
import { CallData, json, type Calldata } from "starknet";
import fs from "node:fs";

async function deployMulticall() {
    const { account } = await settingUp();

    const compiledSierra = json.parse(
        fs
            .readFileSync("./scripts/misc/starknet_multicall_Multicall.contract_class.json")
            .toString("ascii")
    );
    const compiledCasm = json.parse(
        fs
            .readFileSync(
                `./scripts/misc/starknet_multicall_Multicall.compiled_contract_class.json`
            )
            .toString("ascii")
    );
    const callData: CallData = new CallData(compiledSierra.abi);
    const constructor: Calldata = callData.compile("constructor", {});
    const deployResponse = await account.declareAndDeploy({
        contract: compiledSierra,
        casm: compiledCasm,
        constructorCalldata: constructor,
    });
    const deployReceipt = await account.waitForTransaction(deployResponse.deploy.transaction_hash);
    if (deployReceipt.isSuccess()) {
        console.log(`Multicall=${deployResponse.deploy.contract_address}`);

        return {
            abi: compiledSierra.abi,
            address: deployResponse.deploy.contract_address,
            classHash: deployResponse.deploy.classHash,
        };
    } else {
        throw new Error(`Failed to deploy Multicall`);
    }
}

deployMulticall();
