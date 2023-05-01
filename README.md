# Nova ODM / Amazon DynamoDB DataMapper For JavaScript

![GitHub](https://img.shields.io/github/license/ArsenyYankovsky/nova-odm)
![GitHub Workflow Status (with branch)](https://img.shields.io/github/actions/workflow/status/ArsenyYankovsky/nova-odm/run-checks.yml?branch=master)
![npm](https://img.shields.io/npm/dw/@nova-odm/mapper)
![npm bundle size (scoped)](https://img.shields.io/bundlephobia/minzip/@nova-odm/mapper)

A schema-based object to document mapper for Amazon DynamoDB.

This project is a fork and a drop-in replacement of the original [dynamodb-data-mapper-js](https://github.com/awslabs/dynamodb-data-mapper-js).
The goal of this project is to continue maintaining the project.
One major step on this way is already done: this project is migrated to use AWS SDK v3.
Read the migration guide [here](#migrating-from-the-original-dynamodb-data-mapper-js) for more details.

- [Nova ODM / Amazon DynamoDB DataMapper For JavaScript](#nova-odm---amazon-dynamodb-datamapper-for-javascript)
    * [Getting Started](#getting-started)
        + [Installation](#installation)
        + [Defining a Model](#defining-a-model)
    * [Simple Usage](#simple-usage)
        + [`put`](#-put-)
        + [`get`](#-get-)
        + [`update`](#-update-)
        + [`delete`](#-delete-)
        + [`scan`](#-scan-)
        + [`query`](#-query-)
    * [Batch Operations](#batch-operations)
        + [`batchPut`](#-batchput-)
        + [`batchGet`](#-batchget-)
            * [`batchDelete`](#-batchdelete-)
        + [Operations with Expressions](#operations-with-expressions)
            - [Application example](#application-example)
        + [Table lifecycle operations](#table-lifecycle-operations)
            - [`createTable`](#-createtable-)
            - [`ensureTableExists`](#-ensuretableexists-)
            - [`deleteTable`](#-deletetable-)
            - [`ensureTableNotExists`](#-ensuretablenotexists-)
    * [Advanced Usage](#advanced-usage)
        + [Optimistic Locking](#optimistic-locking)
    * [Using with esbuild](#using-with-esbuild)
    * [Migrating from the original dynamodb-data-mapper-js](#migrating-from-the-original-dynamodb-data-mapper-js)
    * [Constituent packages](#constituent-packages)

## Getting Started

### Installation

```sh
npm install @nova-odm/mapper @nova-odm/annotations reflect-metadata
```

```sh
yarn add @nova-odm/mapper @nova-odm/annotations reflect-metadata
```

Import `reflect-metadata` at the top level of your application:

```typescript
import 'reflect-metadata'
```

### Defining a Model

Start by defining a model using decorators from the `@nova-odm/annotations` package.

```typescript
import {
  attribute,
  hashKey,
  rangeKey,
  table,
} from '@nova-odm/annotations';

@table('table_name')
class MyDomainObject {
  public constructor(partial?: Partial<MyDomainObject>) {
    Object.assign(this, partial)
  }
  
  @hashKey()
  id: string;

  @rangeKey({defaultProvider: () => new Date()})
  createdAt: Date;

  @attribute()
  completed?: boolean;
}
```

We also highly recommend adding a partial constructor to your domain classes as shown above.

## Simple Usage

With domain classes defined, you can interact with records in DynamoDB via an
instance of `DataMapper`:

```typescript
import { DataMapper } from '@nova-odm/mapper';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

const mapper = new DataMapper({
    client: new DynamoDBClient({ region: 'us-west-2' }), // the SDK client used to execute operations
    tableNamePrefix: 'dev_' // optionally, you can provide a table prefix to keep your dev and prod tables separate
});
```

### `put`

Creates (or overwrites) an item in the table

```typescript
const savedObject = await mapper.put(new MyDomainObject({id: 'foo'}));
```

### `get`

Retrieves an item from DynamoDB

```typescript
const item = await mapper.get(new MyDomainObject({ id: 'foo', createdAt: new Date(946684800000) }))
```

**NB:** The promise returned by the mapper will be rejected with an
`ItemNotFoundException` if the item sought is not found.

### `update`

Updates an item in the table

```typescript
const item = await mapper.get(new MyDomainObject({ id: 'foo', createdAt: new Date(946684800000) }));

item.completed = true;

await mapper.update(item);
```

Also supports partial updates:

```typescript
await this.mapper.update({
  item: new MyDomainObject({
    id,
    completed: true,
  }),
  onMissing: 'skip',
})
```

This will not update a the `createdAt` property of the item in this example.

### `delete`

Removes an item from the table

```typescript
await mapper.delete(new MyDomainObject({ id: 'foo', createdAt: new Date(946684800000) }));
```

### `scan`

Lists the items in a table or index

```typescript
for await (const item of mapper.scan(MyDomainObject)) {
    // individual items will be yielded as the scan is performed
}

// Optionally, scan an index instead of the table:
for await (const item of mapper.scan(MyDomainObject, { indexName: 'myIndex' })) {
    // individual items will be yielded as the scan is performed
}
```

You can also use the `pages()` method to read items in pages and get the last evaluated key:

```typescript
const paginator = mapper.scan(MyDomainObject, {
  startKey: {
    id: 'foo',
    createdAt: new Date(946684800000),
  },
}).pages()

const domainObjects = []

for await (const page of paginator) {
  // page will be an array of items yielded from the scan
  // Note: the last evaluated key is automatically passed to the next scan operation
  domainObjects.push(...page)
  
  // You can also access the last evaluated key as an object of the shape of your model:
  console.log(paginator.lastEvaluatedKey)
}
```

### `query`

Finds a specific item (or range of items) in a table or index

```typescript
for await (const foo of mapper.query(MyDomainObject, { id: 'foo' })) {
    // individual items with a hash key of "foo" will be yielded as the query is performed
}
```

You can also use the `pages()` method to read items in pages and get the last evaluated key:

```typescript
const paginator = mapper.query(MyDomainObject, {
  type: 'Equals',
  subject: 'id',
  object: 'foo',
}, {
  startKey: {
    id: 'foo',
    createdAt: new Date(946684800000),
  },
}).pages()

const domainObjects = []

for await (const page of paginator) {
  // page will be an array of items yielded from the scan
  // Note: the last evaluated key is automatically passed to the next scan operation
  domainObjects.push(...page)
  
  // You can also access the last evaluated key as an object of the shape of your model:
  console.log(paginator.lastEvaluatedKey)
}
```

## Batch Operations

The mapper also supports batch operations. Under the hood, the batch will
automatically be split into chunks that fall within DynamoDB's limits (25 for
`batchPut` and `batchDelete`, 100 for `batchGet`). The items can belong to any
number of tables, and exponential backoff for unprocessed items is handled
automatically.

### `batchPut`

Creates (or overwrites) multiple items in the table

```typescript
const toSave = [
    new MyDomainObject({id: 'foo', completed: false}),
    new MyDomainObject({id: 'bar', completed: false}),
];
for await (const persisted of mapper.batchPut(toSave)) {
    // items will be yielded as they are successfully written
}
```

### `batchGet`

Fetches multiple items from the table

```typescript
const toGet = [
    new MyDomainObject({id: 'foo', createdAt: new Date(946684800000)}),
    new MyDomainObject({id: 'bar', createdAt: new Date(946684800001)}),
];
for await (const found of mapper.batchGet(toGet)) {
    // items will be yielded as they are successfully retrieved
}
```

**NB:** Only items that exist in the table will be retrieved. If a key is not
found, it will be omitted from the result.

##### `batchDelete`

Removes multiple items from the table

```typescript
const toRemove = [
    new MyDomainObject({ id: 'foo', createdAt: new Date(946684800000) }),
    new MyDomainObject({ id: 'bar', createdAt: new Date(946684800001) }),
];
for await (const found of mapper.batchDelete(toRemove)) {
    // items will be yielded as they are successfully removed
}
```


### Operations with Expressions

#### Application example

The following example shows how to use the mapper with expressions. It will only insert a new record if the email is not already in use.

```typescript
import {
    AttributePath,
    FunctionExpression,
    UpdateExpression,
} from '@nova-odm/expressions';

const expr = new UpdateExpression();

// given the anotation bellow
@table('tableName')
class MyRecord {
    public constructor(partial?: Partial<MyRecord>) {
        Object.assign(this, partial)
    }
  
    @hashKey()
    email?: string;

    @attribute()
    passwordHash?: string;

    @attribute()
    passwordSalt?: string;

    @attribute()
    verified?: boolean;

    @attribute()
    verifyToken?: string;
}

// you make a mapper operation as follows
const aRecord = new MyRecord({
    email,
    passwordHash: password,
    passwordSalt: salt,
    verified: false,
    verifyToken: token,
});

const result = await mapper.put(aRecord, { 
    condition: new FunctionExpression('attribute_not_exists', new AttributePath('email')) 
})
``` 

### Table lifecycle operations

#### `createTable`

Creates a table for the mapped class and waits for it to be initialized:

```typescript
await mapper.createTable(MyDomainObject, {readCapacityUnits: 5, writeCapacityUnits: 5})
```

#### `ensureTableExists`

Like `createTable`, but only creates the table if it doesn't already exist:

```typescript
await mapper.ensureTableExists(MyDomainObject, {readCapacityUnits: 5, writeCapacityUnits: 5})
```

#### `deleteTable`

Deletes the table for the mapped class and waits for it to be removed:

```typescript
await mapper.deleteTable(MyDomainObject)
```

#### `ensureTableNotExists`

Like `deleteTable`, but only deletes the table if it exists:

```typescript
await mapper.ensureTableNotExists(MyDomainObject)
```

## Advanced Usage

### Optimistic Locking

The Nova ODM supports [optimistic locking](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBMapper.OptimisticLocking.html) via the `versionAttribute` decorator.

```typescript
import { attribute, hashKey, rangeKey, table, versionAttribute } from '@nova-odm/annotations'
import { State, JourneyModel } from '../journey'

@table('posts')
export class Post {
  public constructor(partial?: Partial<Post>) {
    Object.assign(this, partial)
  }

  @hashKey()
  public id: string

  @attribute()
  public title: string

  @attribute()
  public text: string

  @versionAttribute()
  public version: number
}
```

Every time an item is saved, the version attribute will be incremented. If the version attribute is not present on the item, it will be set to `1`. If the version attribute is present but does not match the version of the item in the table, the save will fail with a `ConditionalCheckFailedException`.

You can also skip the version check/increment by passing `skipVersionCheck: true` to the `put` or `update` methods.

```typescript
await mapper.update({
  item: new Post({
    id: '123',
    title: 'My Post',
  }),
  onMissing: 'skip',
  skipVersionCheck: true,
})
```

## Using with esbuild

Nova ODM is written in TypeScript and can be used with [esbuild](https://esbuild.github.io/) to bundle your application. However, esbuild does not emit decorator metadata, so we recommend using a `esbuild-plugin-tsc` plugin.


First, install the plugin and `typescript`:

```shell
npm install --save-dev esbuild-plugin-tsc typescript
```

or

```shell
yarn add -D esbuild-plugin-tsc typescript
```

Then, add the plugin to your esbuild configuration:

Javascript:
   ```diff
   +const esbuildPluginTsc = require('esbuild-plugin-tsc');
    ...
    esbuild.build({
      ...
      plugins: [
   +    esbuildPluginTsc(),
      ],
    })
   ```

Typescript:
   ```diff
   +import esbuildPluginTsc from 'esbuild-plugin-tsc';
    ...
    esbuild.build({
      ...
      plugins: [
   +    esbuildPluginTsc(),
      ],
    })
   ```

## Migrating from the original dynamodb-data-mapper-js

This project provides drop-in replacement packages for the original packages. Replace your dependencies / imports with the following respective packages:

| dynamodb-data-mapper-js               | Nova ODM                  |
|---------------------------------------|---------------------------|
| @aws/dynamodb-data-mapper             | @nova-odm/mapper          |
| @aws/dynamodb-query-iterator          | @nova-odm/query-iterator  |
| @aws/dynamodb-data-marshaller         | @nova-odm/marshaller      |
| @aws/dynamodb-expressions             | @nova-odm/expressions     |
| @aws/dynamodb-batch-iterator          | @nova-odm/batch-iterator  |
| @aws/dynamodb-auto-marshaller         | @nova-odm/auto-marshaller |
| @aws/dynamodb-data-mapper-annotations | @nova-odm/annotations     |


## Constituent packages

The Nova ODM is developed as a monorepo using [`lerna`](https://github.com/lerna/lerna).
More detailed documentation about the ODM's constituent packages is available
by viewing those packages directly.

* [Nova ODM / Amazon DynamoDB Automarshaller](packages/auto-marshaller/)
* [Nova ODM / Amazon DynamoDB Batch Iterator](packages/batch-iterator/)
* [Nova ODM / Amazon DynamoDB DataMapper](packages/mapper/)
* [Nova ODM / Amazon DynamoDB DataMapper Annotations](packages/annotations/)
* [Nova ODM / Amazon DynamoDB Data Marshaller](packages/marshaller/)
* [Nova ODM / Amazon DynamoDB Expressions](packages/expressions/)
* [Nova ODM / Amazon DynamoDB Query Iterator](packages/query-iterator/)
