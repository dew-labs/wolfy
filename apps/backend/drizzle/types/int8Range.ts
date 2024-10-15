import { customType } from "drizzle-orm/pg-core/columns/custom";
import { Range, parse as rangeParse, serialize as rangeSerialize } from "postgres-range";

type RangeBound<T> = {
    value: T;
    inclusive: boolean;
};

export class Int8Range {
    constructor(public readonly range: Range<bigint>) {}

    get start(): RangeBound<bigint> | null {
        return this.range.lower != null
            ? {
                  value: this.range.lower,
                  inclusive: this.range.isLowerBoundClosed(),
              }
            : null;
    }

    get end(): RangeBound<bigint> | null {
        return this.range.upper != null
            ? {
                  value: this.range.upper,
                  inclusive: this.range.isUpperBoundClosed(),
              }
            : null;
    }
}

export const int8range = customType<{
    data: Int8Range;
}>({
    dataType: () => "int8range",
    fromDriver: (value: unknown): Int8Range => {
        if (typeof value !== "string") {
            throw new Error("Expected string");
        }

        const parsed = rangeParse(value, (val) => BigInt(val));
        return new Int8Range(parsed);
    },
    toDriver: (value: Int8Range): string => {
        return rangeSerialize(value.range);
    },
});
