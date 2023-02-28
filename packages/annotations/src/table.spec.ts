import {table} from "./table";
import {DynamoDbTable} from '@nova-odm/mapper';

describe('table', () => {
    it(
        'should bind the provided table name to the target in a way compatible with the DynamoDbTable protocol',
        () => {
            class MyDocument {}
            const tableName = 'tableName';
            const decorator = table(tableName);
            decorator(MyDocument);

            expect((new MyDocument() as any)[DynamoDbTable]).toBe(tableName);
        }
    );
});
