import { Type } from "@sinclair/typebox";

export interface Position {
    key: string;
    sizeDeltaUsd: bigint;
}

export const PositionSchema = Type.Object({
    key: Type.String(),
    sizeDeltaUsd: Type.BigInt(),
});

export const PositionsSchema = Type.Optional(Type.Array(PositionSchema));
