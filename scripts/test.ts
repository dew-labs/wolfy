import { hash } from "starknet";
import { getCompiledCasm, getCompiledSierra } from "./utils";

const compiledMarketTokenCasm = getCompiledCasm("MarketToken");
const compiledMarketTokenSierra = getCompiledSierra("MarketToken");

console.log(hash.computeSierraContractClassHash(compiledMarketTokenSierra));
