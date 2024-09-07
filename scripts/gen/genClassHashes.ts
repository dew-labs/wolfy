import fs from "node:fs";
import { getClassHash } from "shared/utils/utils";

function getClassHashes() {
    const paths = fs
        .readdirSync("./target/dev", { withFileTypes: true })
        .filter((file) => file.isFile() && file.name.endsWith(".contract_class.json"))
        .map((file) => file.name.replace("satoru_", "").replace(".contract_class.json", ""));

    const classHashes = paths.map((path) => ({
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
