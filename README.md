# BumbleDB

Embedded, file-based database with MongoDB-like API for Node.js

## Getting started

```ts
import { BumbleClient } from 'bumbledb';

const main = asnyc () => {
  const dataDirectory = process.env.DATA_DIRECTORY || '.data';

  const db = await BumbleClient.connect(dataDirectory);

  const someDocument = { id: 1, name: 'Meredith', country: 'US' };
  await db.collection('users').insertOne(someDocument);

  const result = await db.collection('users').find({}).toArray();
  console.log(result);
}

main();
```

## Insert data

### `insertOne`

```ts
const someDocument = { id: 1, name: 'Meredith', country: 'US' };
await db.collection('users').insertOne(someDocument);
```

### `insertMany`

```ts
const someDocuments = [
  { id: 1, name: 'Meredith', country: 'US' },
  { id: 2, name: 'Monika', country: 'DE' }
];
await db.collection('users').insertMany(someDocuments);
```

## Query data

### `findOne`

```ts
const result = await db.collection('users').findOne({ id: 5 });
```

### `find`

Get all documents

```ts
const result = await db
  .collection('users')
  .find({})
  .toArray();
```

Get documents matching query

```ts
const result = await db
  .collection('users')
  .find({ name: '', country: 'DE' })
  .toArray();
```

Query using nested attributes

```ts
const result = await db
  .collection('users')
  .find({ 'address.country': 'DE' })
  .toArray();
```

## Update data

### `update`

```ts
const newDocument = { id: 1, name: 'users', country: 'US' };
await db.collection('users').update({ id: 1 }, newDocument);
```

## Delete data

### `delete`

```ts
const affected = await db.collection('users').delete({ id: 1 });
```