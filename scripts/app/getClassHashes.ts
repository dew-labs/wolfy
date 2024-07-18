import fs from "fs";
import { getClassHash } from "../utils";

function getCompiledContractClasses() {
    const paths = fs
        .readdirSync("./target/dev", { withFileTypes: true })
        .filter((file) => file.isFile() && file.name.endsWith(".contract_class.json"))
        .map((file) => file.name.replace("satoru_", "").replace(".contract_class.json", ""));

    return paths.map((path) => ({
        name: path,
        hash: getClassHash(path),
    }));
}

console.log(getCompiledContractClasses());
