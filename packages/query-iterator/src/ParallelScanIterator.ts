import { ItemIterator } from './ItemIterator';
import { ParallelScanInput } from './ParallelScanInput';
import {
    ParallelScanPaginator,
    ParallelScanState,
} from './ParallelScanPaginator';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

export class ParallelScanIterator extends ItemIterator<ParallelScanPaginator> {
    constructor(
        client: DynamoDBClient,
        input: ParallelScanInput,
        scanState?: ParallelScanState
    ) {
        super(new ParallelScanPaginator(client, input, scanState));
    }
}
