# BumbleDB

Embedded, file-based database with MongoDB-like API for Node.js

## Getting started

```ts
import initializeDb from 'bumbledb';

const dataDirectory = process.env.DATA_DIRECTORY ?? '.data';

const db = await initializeDb(dataDirectory);

const someDocument = { id: 1, name: 'Meredith', country: 'US' };
await db.collection('users').insertOne(someDocument);

const result = await db.collection('users').find({}).toArray();
console.log(result);
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
  .find({ name: 'Monika', country: 'DE' })
  .toArray();
```

Query using nested attributes

```ts
const result = await db
  .collection('users')
  .find({ 'address.country': 'DE' })
  .toArray();
```

Stream results with async iteration

```ts
for await (const user of db.collection('users').find({ country: 'DE' })) {
  console.log(user);
}
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

## Drop data

### Drop a collection

```ts
await db.collection('users').drop();
```

### Drop the database

```ts
await db.drop();
```

## List collections

### `collections`

```ts
const names = await db.collections();
// ['users', 'posts']
```