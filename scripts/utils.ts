import {
    Account,
    CallData,
    hash,
    json,
    shortString,
    type Abi,
    type Calldata,
    type Contract,
    type RawArgs,
    type CompiledSierra,
    type CairoAssembly,
    type CompiledContract,
    RpcProvider,
} from "starknet";
import fs from "fs";

export function pascalToUpperSnakeCase(pascalStr: string): string {
    return pascalStr
        .replace(/([A-Z])/g, "_$1")
        .toUpperCase()
        .slice(1);
}

export function getCompiledSierra(contractPath: string) {
    return json.parse(
        fs.readFileSync(`./target/dev/satoru_${contractPath}.contract_class.json`).toString("ascii")
    ) as CompiledSierra;
}

export function getCompiledCasm(contractPath: string) {
    return json.parse(
        fs
            .readFileSync(`./target/dev/satoru_${contractPath}.compiled_contract_class.json`)
            .toString("ascii")
    ) as CairoAssembly;
}

export async function ensureDeployed(
    account: Account,
    contractAddress: string | undefined,
    contractPath: string,
    constructWith: RawArgs,
    additionInfo: true
): Promise<{
    address: string;
    classHash: string;
    abi: Abi;
}>;
export async function ensureDeployed(
    account: Account,
    contractAddress: string | undefined,
    contractPath: string,
    constructWith: RawArgs,
    additionInfo?: false
): Promise<{
    address: string;
}>;
export async function ensureDeployed(
    account: Account,
    contractAddress: string | undefined,
    contractPath: string,
    constructWith: RawArgs,
    additionInfo = false
): Promise<{
    address: string;
    classHash: string | undefined;
    abi: Abi | undefined;
}> {
    if (!contractAddress) {
        const compiledSierra = getCompiledSierra(contractPath);
        const compiledCasm = getCompiledCasm(contractPath);
        const callData: CallData = new CallData(compiledSierra.abi);
        const constructor: Calldata = callData.compile("constructor", constructWith);
        const deployResponse = await account.declareAndDeploy({
            contract: compiledSierra,
            casm: compiledCasm,
            constructorCalldata: constructor,
        });
        await account.waitForTransaction(deployResponse.deploy.transaction_hash);
        console.log(
            `${pascalToUpperSnakeCase(contractPath)}=${deployResponse.deploy.contract_address}`
        );
        return {
            abi: compiledSierra.abi,
            address: deployResponse.deploy.contract_address,
            classHash: deployResponse.deploy.classHash,
        };
    } else {
        return {
            address: contractAddress,
            abi: additionInfo ? getCompiledSierra(contractPath).abi : undefined,
            classHash: additionInfo
                ? hash.computeSierraContractClassHash(getCompiledSierra(contractPath))
                : undefined,
        };
    }
}

export async function hasRole(
    roleStoreContract: Contract,
    address: string,
    role: string
): Promise<boolean> {
    return (await roleStoreContract.call("has_role", [
        address,
        shortString.encodeShortString(role),
    ])) as boolean;
}

export async function ensureRole(
    roleStoreContract: Contract,
    entityName: string,
    address: string,
    role: string
): Promise<void> {
    const alreadyHasRole = await hasRole(roleStoreContract, address, role);
    if (!alreadyHasRole) {
        const roleCall = roleStoreContract.populate("grant_role", [
            address,
            shortString.encodeShortString(role),
        ]);
        const grant_role_tx = await roleStoreContract.grant_role(roleCall.calldata);
        await roleStoreContract.providerOrAccount.waitForTransaction(
            grant_role_tx.transaction_hash
        );
        console.log(`${role} role granted to ${entityName}.`);
    } else {
        console.log(`${role} role already granted to ${entityName}.`);
    }
}

export async function ensureDeclared(account: Account, contractPath: string): Promise<string> {
    const compiledCasm = getCompiledCasm(contractPath);
    const compiledSierra = getCompiledSierra(contractPath);
    try {
        const declareResponse = await account.declare({
            contract: compiledSierra,
            casm: compiledCasm,
        });
        await account.waitForTransaction(declareResponse.transaction_hash);
        console.log(`${contractPath} declared.`);
    } catch (error) {
        console.log("${contractPath} already declared.");
    }
    return getClassHashFromSierra(compiledSierra);
}

export function getClassHashFromSierra(compiledSierra: CompiledSierra) {
    return hash.computeSierraContractClassHash(compiledSierra);
}

export function getClassHash(path: string) {
    return hash.computeSierraContractClassHash(getCompiledSierra(path));
}

export function getClassHashFromCasm(compiledContract: CompiledContract | string) {
    return hash.computeContractClassHash(compiledContract);
}

export async function settingUp() {
    // Connect to provider
    const providerUrl = process.env.PROVIDER_URL;
    const provider = new RpcProvider({ nodeUrl: providerUrl! });

    // Connect to account
    const privateKey0: string = process.env.ACCOUNT_PRIVATE as string;
    const account0Address: string = process.env.ACCOUNT_PUBLIC as string;
    const account0 = new Account(provider, account0Address!, privateKey0!);

    console.log(`Interacting with Account: ${account0Address} via provider: ${providerUrl}`);

    const resp = await account0.getSpecVersion();
    console.log("rpc version =", resp);

    return account0;
}
