import { cleanup, getDbWithTestData } from './util';
import testData from './util/test-data';

afterEach(cleanup);

test('update', async () => {
  const db = await getDbWithTestData();
  await db.collection('test').update({ id: 1 }, testData[1]);
  const result = await db.collection('test').find({}).toArray();
  expect(result).toEqual([testData[1], testData[1], testData[2], testData[3]]);
});
