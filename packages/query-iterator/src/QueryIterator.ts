import { ItemIterator } from './ItemIterator';
import { QueryPaginator } from './QueryPaginator';
import { QueryInput, DynamoDBClient } from '@aws-sdk/client-dynamodb';

export class QueryIterator extends ItemIterator<QueryPaginator> {
    constructor(client: DynamoDBClient, input: QueryInput, limit?: number) {
        super(new QueryPaginator(client, input, limit));
    }
}
