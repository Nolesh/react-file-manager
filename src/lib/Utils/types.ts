export const getProp = <ObjectType, KeyType extends keyof ObjectType>(
    object: ObjectType,
    key: KeyType
) => object && object[key];

export type TStyle = { className?: string; style?: React.CSSProperties };

export type TComponent<T> = (args: T) => React.ReactElement;

export type SameType<T, R extends string | number | symbol> = { [S in R]: T };

export type Exclude<T, R> = { [K in keyof T as T[K] extends R ? never : K]: T[K] };

export type ExtractKeys<T> = keyof T;

export type ReadOnly<T> = { [P in keyof T]: Readonly<T[P]> };

export type PartialBy<T, K extends keyof T> = Omit<T, K> & Pick<Partial<T>, K>;
