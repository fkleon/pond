// Adapted from typedoc kind.ts
export const ReflectionKind = Object.freeze({
    Project: Symbol.for(0x1),
    Module: Symbol.for(0x2),
    Namespace: Symbol.for(0x4),
    Enum: Symbol.for(0x8),
    EnumMember: Symbol.for(0x10),
    Variable: Symbol.for(0x20),
    Function: Symbol.for(0x40),
    Class: Symbol.for(0x80),
    Interface: Symbol.for(0x100),
    Constructor: Symbol.for(0x200),
    Property: Symbol.for(0x400),
    Method: Symbol.for(0x800),
    CallSignature: Symbol.for(0x1000),
    IndexSignature: Symbol.for(0x2000),
    ConstructorSignature: Symbol.for(0x4000),
    Parameter: Symbol.for(0x8000),
    TypeLiteral: Symbol.for(0x10000),
    TypeParameter: Symbol.for(0x20000),
    Accessor: Symbol.for(0x40000),
    GetSignature: Symbol.for(0x80000),
    SetSignature: Symbol.for(0x100000),
    TypeAlias: Symbol.for(0x200000),
    Reference: Symbol.for(0x400000),
    Document: Symbol.for(0x800000),
});

export function kindFromVal(kindVal) {
    return Object.values(ReflectionKind).find((v) => v === Symbol.for(kindVal));
}
