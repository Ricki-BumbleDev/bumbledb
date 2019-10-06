import { cleanup, getDbWithTestData } from './utils';
import testData from './utils/test-data';

afterEach(cleanup);

test('find with criteria', async () => {
  const db = await getDbWithTestData();
  const result = await db
    .collection('test')
    .find({ firstName: 'Amanda' })
    .toArray();
  expect(result).toEqual([testData[1], testData[2]]);
});

test('findOne', async () => {
  const db = await getDbWithTestData();
  const result = await db.collection('test').findOne({ email: 'amanda.cross@einrot.com' });
  expect(result).toEqual(testData[1]);
});

test('find with no match', async () => {
  const db = await getDbWithTestData();
  const result = await db
    .collection('test')
    .find({ email: 'roman.anderson@einrot.com' })
    .toArray();
  expect(result).toEqual([]);
});

test('findOne with no match', async () => {
  const db = await getDbWithTestData();
  const result = await db.collection('test').findOne({ email: 'roman.anderson@einrot.com' });
  expect(result).toBeNull();
});

test('findOne with two criteria', async () => {
  const db = await getDbWithTestData();
  const result = await db.collection('test').findOne({ email: 'amanda.taylor@gustr.com', lastName: 'Taylor' });
  expect(result).toEqual(testData[2]);
});

test('find with nested criteria', async () => {
  const db = await getDbWithTestData();
  const result = await db
    .collection('test')
    .find({ 'address.country': 'Cayman Islands' })
    .toArray();
  expect(result).toEqual([testData[1], testData[3]]);
});

test('findOne with nested criteria', async () => {
  const db = await getDbWithTestData();
  const result = await db.collection('test').findOne({ 'address.country': 'Pakistan' });
  expect(result).toEqual(testData[0]);
});

test('findOne with two criteria and one not matching', async () => {
  const db = await getDbWithTestData();
  const result = await db.collection('test').findOne({ email: 'amanda.cross@einrot.com', lastName: 'Taylor' });
  expect(result).toBeNull();
});
