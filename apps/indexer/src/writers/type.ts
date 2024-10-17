import type {
    FullBlock,
    Transaction,
} from "@snapshot-labs/checkpoint/dist/src/providers/starknet/types";
import type { BaseWriterParams } from "@snapshot-labs/checkpoint";
import type { SatoruEvent, ParsedSatoruEvent } from "satoru-sdk";

export type SatoruEventWriter<T extends SatoruEvent> = (
    args: {
        tx: Transaction;
        block: FullBlock | null;
        rawEvent?: Event;
        event?: ParsedSatoruEvent<T>;
    } & BaseWriterParams
) => Promise<void>;
