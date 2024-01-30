import { IntrospectionEnumValue } from 'graphql';
export declare type SimplifiedArg = {
    name: string;
    description: string;
    defaultValue: any;
    typeWrappers: ('NON_NULL' | 'LIST')[];
    id?: string;
};
export declare type SimplifiedField<T> = {
    name: string;
    type: T;
    id?: string;
    relayType: T;
    description: string;
    typeWrappers: ('NON_NULL' | 'LIST')[];
    isDeprecated: boolean;
    deprecationReason?: string;
    args: {
        [name: string]: SimplifiedArg;
    };
    relayArgs: {
        [name: string]: SimplifiedArg;
    };
};
export declare type SimplifiedInputField = SimplifiedArg;
export declare type SimplifiedTypeBase = {
    kind: 'OBJECT' | 'INTERFACE' | 'UNION' | 'ENUM' | 'INPUT_OBJECT' | 'SCALAR';
    name: string;
    description: string;
    enumValues?: IntrospectionEnumValue[];
    inputFields?: {
        [name: string]: SimplifiedInputField;
    };
    isRelayType?: boolean;
};
export declare type SimplifiedType = SimplifiedTypeBase & {
    fields?: {
        [name: string]: SimplifiedField<string>;
    };
    interfaces?: string[];
    derivedTypes?: string[];
    possibleTypes?: string[];
};
export declare type SimplifiedTypeWithIDs = SimplifiedTypeBase & {
    id: string;
    fields?: {
        [name: string]: SimplifiedField<SimplifiedTypeWithIDs>;
    };
    interfaces?: {
        id: string;
        type: SimplifiedTypeWithIDs;
    }[];
    derivedTypes?: {
        id: string;
        type: SimplifiedTypeWithIDs;
    }[];
    possibleTypes?: {
        id: string;
        type: SimplifiedTypeWithIDs;
    }[];
};
export declare type SimplifiedIntrospection = {
    types: {
        [typeName: string]: SimplifiedType;
    };
    queryType: string;
    mutationType: string | null;
    subscriptionType: string | null;
};
export declare type SimplifiedIntrospectionWithIds = {
    types: {
        [typeName: string]: SimplifiedTypeWithIDs;
    };
    queryType: SimplifiedTypeWithIDs;
    mutationType: SimplifiedTypeWithIDs | null;
    subscriptionType: SimplifiedTypeWithIDs | null;
};
