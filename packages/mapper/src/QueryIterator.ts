import { Iterator } from './Iterator';
import { QueryOptions } from './namedParameters';
import { QueryPaginator } from './QueryPaginator';
import { ZeroArgumentsConstructor } from '@nova-odm/marshaller';
import {
    ConditionExpression,
    ConditionExpressionPredicate,
} from '@nova-odm/expressions';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

/**
 * Iterates over each item returned by a DynamoDB query until no more pages are
 * available.
 */
export class QueryIterator<T> extends Iterator<T, QueryPaginator<T>> {
    constructor(
        client: DynamoDBClient,
        valueConstructor: ZeroArgumentsConstructor<T>,
        keyCondition: ConditionExpression |
            {[propertyName: string]: ConditionExpressionPredicate|any},
        options?: QueryOptions & {tableNamePrefix?: string}
    ) {
        super(
            new QueryPaginator(client, valueConstructor, keyCondition, options)
        );
    }
}
