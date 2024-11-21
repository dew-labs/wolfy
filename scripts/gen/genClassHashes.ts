import { getClassHash } from "@freyr/shared/utils";
import fs from "node:fs";

const PROJECT_NAME = "freyr";

function getClassHashes() {
    const paths = fs
        .readdirSync("./target/release", { withFileTypes: true })
        .filter(
            (file) =>
                file.isFile() &&
                file.name.endsWith(".contract_class.json") &&
                !file.name.startsWith(`${PROJECT_NAME}_tests`) &&
                !file.name.startsWith(`${PROJECT_NAME}_unittest`)
        )
        .map((file) =>
            file.name.replace(PROJECT_NAME + "_", "").replace(".contract_class.json", "")
        );

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
