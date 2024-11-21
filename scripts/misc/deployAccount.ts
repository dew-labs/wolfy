import { createAsker, settingUp } from "@freyr/shared/utils";
import {
    Account,
    CairoCustomEnum,
    CairoOption,
    CairoOptionVariant,
    CallData,
    Contract,
    ec,
    hash,
    json,
    uint256,
} from "starknet";
import fs from "node:fs";
import invariant from "tiny-invariant";
import { toStarknetHexString } from "wolfy-sdk";

// Argent X account v0.4.0
const ARGENT_X_ACCOUNT_CLASS_HASH =
    "0x036078334509b514626504edc9fb252328d1a240e4e948bef8d0c08dff45927f";

async function declareAgentClass() {
    const { account } = await settingUp();

    const compiledSierra = json.parse(
        fs.readFileSync("./scripts/misc/ArgentAccount.json").toString("ascii")
    );
    const compiledCasm = json.parse(
        fs.readFileSync(`./scripts/misc/ArgentAccount.casm`).toString("ascii")
    );
    const declareResponse = await account.declare({
        contract: compiledSierra,
        casm: compiledCasm,
    });
    const declareReceipt = await account.waitForTransaction(declareResponse.transaction_hash);
    if (declareReceipt.isSuccess()) {
        console.log(`ArgentAccount declared.`);
    } else {
        throw new Error(`Failed to declare ArgentAccount.`);
    }
}

async function transferTokensToAccount(address: string) {
    const { provider, account } = await settingUp();

    const ethToken = "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";
    const { abi: ethAbi } = await provider.getClassAt(ethToken);
    const ethTokenContract = new Contract(ethAbi, ethToken, provider);
    ethTokenContract.connect(account);
    await ethTokenContract.transfer(address, uint256.bnToUint256(1000000000000000000n)); // 1 ETH
    console.log(`Eth transferred to account1`);

    const strkToken = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";
    const { abi: strkAbi } = await provider.getClassAt(strkToken);
    const strkTokenContract = new Contract(strkAbi, strkToken, provider);
    strkTokenContract.connect(account);
    await strkTokenContract.transfer(address, uint256.bnToUint256(100000000000000000000n)); // 100 STRK
    console.log(`Strk transferred to account1`);
}

async function deployArgentAccount() {
    const { ask, doneAsking } = createAsker();

    const address = await ask("Enter account address");
    const pk = await ask("Enter private key");

    // const pk = "";
    // const address = "";

    try {
        await declareAgentClass();
    } catch {
        console.log(`ArgentAccount already declared.`);
    }

    // Generate public and private key pair.
    const privateKeyAX = pk;
    const starkKeyPubAX = ec.starkCurve.getStarkKey(privateKeyAX);
    console.log("AX_ACCOUNT_PUBLIC_KEY=", starkKeyPubAX);

    // Calculate future address of the ArgentX account
    const axSigner = new CairoCustomEnum({ Starknet: { pubkey: starkKeyPubAX } });
    const axGuardian = new CairoOption<unknown>(CairoOptionVariant.None);
    const AXConstructorCallData = CallData.compile({
        owner: axSigner,
        guardian: axGuardian,
    });
    const AXcontractAddress = hash.calculateContractAddressFromHash(
        starkKeyPubAX,
        ARGENT_X_ACCOUNT_CLASS_HASH,
        AXConstructorCallData,
        0
    );
    console.log("Calculated AX contract address=", AXcontractAddress);
    invariant(
        toStarknetHexString(AXcontractAddress) === toStarknetHexString(address),
        "AX contract address mismatch"
    );

    await transferTokensToAccount(address);

    const { provider } = await settingUp();

    const accountAX = new Account(provider, AXcontractAddress, privateKeyAX);

    const deployAccountPayload = {
        classHash: ARGENT_X_ACCOUNT_CLASS_HASH,
        constructorCalldata: AXConstructorCallData,
        contractAddress: AXcontractAddress,
        addressSalt: starkKeyPubAX,
    };

    const { transaction_hash: AXdAth, contract_address: AXcontractFinalAddress } =
        await accountAX.deployAccount(deployAccountPayload);

    console.log("ArgentX wallet account deployed");

    doneAsking();
}

deployArgentAccount();
