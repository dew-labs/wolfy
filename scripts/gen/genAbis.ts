import { json } from "starknet";
import fs from "node:fs";
import { getContractNames, getCompiledSierraPath } from "packages/shared/src/utils";

function genAbis() {
    const names = getContractNames();
    const contractsPath = names.map((name) => {
        return [name, getCompiledSierraPath(name)] as const;
    });

    contractsPath.forEach(([name, path]) => {
        const compiledSierra = json.parse(fs.readFileSync(path).toString("ascii"));
        const abiContent = JSON.stringify(compiledSierra.abi);
        fs.writeFileSync(`${__dirname}/../../artifacts/${name}Abi.json`, abiContent, { flag: "w" });
        const tsContent = `const ${name}ABI=${abiContent} as const;export default ${name}ABI`;
        fs.writeFileSync(`${__dirname}/../../artifacts/${name}ABI.ts`, tsContent, {
            flag: "w",
        });
    });
}

genAbis();
