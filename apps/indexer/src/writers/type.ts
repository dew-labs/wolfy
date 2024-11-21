import type {
    FullBlock,
    Transaction,
} from "@snapshot-labs/checkpoint/dist/src/providers/starknet/types";
import type { BaseWriterParams } from "@snapshot-labs/checkpoint";
import type { WolfyEvent, ParsedWolfyEvent } from "wolfy-sdk";

export type WolfyEventWriter<T extends WolfyEvent> = (
    args: {
        tx: Transaction;
        block: FullBlock | null;
        rawEvent?: Event;
        event?: ParsedWolfyEvent<T>;
    } & BaseWriterParams
) => Promise<void>;
