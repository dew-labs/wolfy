import { getContractNames } from "@freyr/shared/utils";
import fs from "node:fs";
import { getCompiledCasmPath, getCompiledSierraPath } from "../../packages/shared/src/utils/utils";

const MAX_CONTRACT_SIZE = 4089446; // bytes
const MAX_FELTS = 81290;

function getFileSize(path: string) {
    return fs.statSync(path).size;
}

function getFeltCount(path: string) {
    const fileContent = JSON.parse(fs.readFileSync(path).toString("ascii"));
    return fileContent.bytecode.length;
}

function getClassHashes() {
    const names = getContractNames();

    const contractSizes = names
        .map((name) => [name, getFileSize(getCompiledSierraPath(name))] as const)
        .filter(([_, size]) => size > MAX_CONTRACT_SIZE);
    const feltCounts = names
        .map((name) => [name, getFeltCount(getCompiledCasmPath(name))] as const)
        .filter(([_, feltCount]) => feltCount > MAX_FELTS);

    console.log("Contract size exceeded:");
    console.log(contractSizes);
    console.log("Felt count exceeded:");
    console.log(feltCounts);

    if (contractSizes.length > 0) {
        throw new Error("Contract size exceeded");
    }

    if (feltCounts.length > 0) {
        throw new Error("Felt count exceeded");
    }
}

getClassHashes();
