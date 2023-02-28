import { Iterator } from './Iterator';
import { SequentialScanOptions } from './namedParameters';
import { ScanPaginator } from './ScanPaginator';
import { ZeroArgumentsConstructor } from '@nova-odm/marshaller';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

/**
 * Iterates over each item returned by a DynamoDB scan until no more pages are
 * available.
 */
export class ScanIterator<T> extends Iterator<T, ScanPaginator<T>> {
    constructor(
        client: DynamoDBClient,
        valueConstructor: ZeroArgumentsConstructor<T>,
        options?: SequentialScanOptions
    ) {
        super(new ScanPaginator(client, valueConstructor, options));
    }
}
