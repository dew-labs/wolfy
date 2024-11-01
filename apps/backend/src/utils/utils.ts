export const arrayStringToNumberArray = (str: string[]): number[] =>
    str.map(Number).filter((value) => !Number.isNaN(value));

export const isNotEmptyArray = (arr: unknown): boolean => Array.isArray(arr) && arr.length > 0;
