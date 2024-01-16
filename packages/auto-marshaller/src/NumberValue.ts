import {NumberValueImpl} from '@aws-sdk/util-dynamodb';

const NUMBER_VALUE_TAG = 'DynamoDbNumberValue';
const EXPECTED_TAG = `[object ${NUMBER_VALUE_TAG}]`;

/**
 * A number that may contain greater precision than can safely be stored in
 * JavaScript's `number` data type. Numerical values are represented internally
 * as strings (the format used by DynamoDB's JSON-based data representation
 * schema).
 */
export class NumberValue extends NumberValueImpl {
    public readonly value: string;
    public readonly [Symbol.toStringTag] = NUMBER_VALUE_TAG;

    // @ts-ignore
    constructor(value: string|number) {
        // @ts-ignore
        this.value = value.toString().trim();
    }

    /**
     * Convert the value to its desired JSON representation. Called by
     * `JSON.stringify`.
     */
    toJSON(): number {
        return this.valueOf();
    }

    /**
     * Convert the value to its desired string representation. Called
     * automatically when objects are coerced into strings.
     */
    toString(): string {
        return this.value;
    }

    /**
     * Convert the value to its desired literal representation. Called
     * automatically when objects appear in arithmetic expressions.
     */
    // @ts-ignore
    valueOf(): number {
        return Number(this.value);
    }

    /**
     * Evaluate whether the provided value is a NumberValue object.
     */
    static isNumberValue(arg: any): arg is NumberValue {
        return (typeof NumberValue === 'function' && arg instanceof NumberValue)
            || Object.prototype.toString.call(arg) === EXPECTED_TAG;
    }
}
