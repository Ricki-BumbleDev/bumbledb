import { cleanup, getDbWithTestData, getEmptyDb } from './util';
import testData from './util/test-data';

afterEach(cleanup);

// collections()

test('collections returns empty array when no collections exist', async () => {
  const db = await getEmptyDb();
  const result = await db.collections();
  expect(result).toEqual([]);
});

test('collections returns collection names', async () => {
  const db = await getEmptyDb();
  await db.collection('users').insertOne(testData[0]);
  await db.collection('posts').insertOne(testData[1]);
  const result = await db.collections();
  expect(result.sort()).toEqual(['posts', 'users']);
});

// collection.drop()

test('collection drop removes the collection', async () => {
  const db = await getDbWithTestData();
  await db.collection('test').drop();
  const result = await db.collection('test').find({}).toArray();
  expect(result).toEqual([]);
});

test('collection drop removes it from collections list', async () => {
  const db = await getEmptyDb();
  await db.collection('users').insertOne(testData[0]);
  await db.collection('users').drop();
  const result = await db.collections();
  expect(result).toEqual([]);
});

test('collection drop is idempotent when collection does not exist', async () => {
  const db = await getEmptyDb();
  await expect(db.collection('ghost').drop()).resolves.toBeUndefined();
});

// db.drop()

test('db drop removes all collections', async () => {
  const db = await getEmptyDb();
  await db.collection('users').insertOne(testData[0]);
  await db.collection('posts').insertOne(testData[1]);
  await db.drop();
  const result = await db.collections();
  expect(result).toEqual([]);
});

test('db drop leaves database usable afterward', async () => {
  const db = await getDbWithTestData();
  await db.drop();
  await db.collection('test').insertOne(testData[0]);
  const result = await db.collection('test').find({}).toArray();
  expect(result).toEqual([testData[0]]);
});

// find() async iterable

test('find returns all documents via async iteration', async () => {
  const db = await getDbWithTestData();
  const result = [];
  for await (const doc of db.collection('test').find({})) {
    result.push(doc);
  }
  expect(result).toEqual(testData);
});

test('find filters documents via async iteration', async () => {
  const db = await getDbWithTestData();
  const result = [];
  for await (const doc of db.collection('test').find({ firstName: 'Amanda' })) {
    result.push(doc);
  }
  expect(result).toEqual([testData[1], testData[2]]);
});

test('find async iteration and toArray return the same results', async () => {
  const db = await getDbWithTestData();
  const cursor = db.collection('test').find({ 'address.country': 'Cayman Islands' });
  const fromIterable = [];
  for await (const doc of cursor) {
    fromIterable.push(doc);
  }
  const fromToArray = await db.collection('test').find({ 'address.country': 'Cayman Islands' }).toArray();
  expect(fromIterable).toEqual(fromToArray);
});

test('find async iteration yields no results when query has no match', async () => {
  const db = await getDbWithTestData();
  const result = [];
  for await (const doc of db.collection('test').find({ firstName: 'Nobody' })) {
    result.push(doc);
  }
  expect(result).toEqual([]);
});
