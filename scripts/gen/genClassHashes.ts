import { getClassHash, getContractNames } from "@freyr/shared/utils";
import fs from "node:fs";

function getClassHashes() {
    const names = getContractNames();

    const classHashes = names.map((path) => ({
        name: path,
        hash: getClassHash(path),
    }));

    const classHashRecord: Record<string, string> = {};
    classHashes.forEach((hash) => {
        classHashRecord[hash.name] = hash.hash;
    });

    return classHashRecord;
}

const classHashRecord = getClassHashes();

console.log(classHashRecord);

fs.writeFileSync(
    `${__dirname}/../../artifacts/classHashes.json`,
    JSON.stringify(classHashRecord, null, 4),
    {
        flag: "w",
    }
);
