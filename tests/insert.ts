import { cleanup, getEmptyDb } from './utils';
import testData from './utils/test-data';

afterEach(cleanup);

test('insertMany / find', async () => {
  const db = await getEmptyDb();
  await db.collection('test').insertMany(testData);
  const result = await db.collection('test').find({}).toArray();
  expect(result).toEqual(testData);
});

test('insertOne', async () => {
  const db = await getEmptyDb();
  await db.collection('test').insertOne(testData[0]);
  const result = await db.collection('test').find({}).toArray();
  expect(result).toEqual([testData[0]]);
});
