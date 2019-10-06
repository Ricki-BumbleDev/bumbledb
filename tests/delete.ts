import { cleanup, getDbWithTestData } from './utils';
import testData from './utils/test-data';

afterEach(cleanup);

test('delete', async () => {
  const db = await getDbWithTestData();
  await db.collection('test').delete({ id: 2 });
  const result = await db
    .collection('test')
    .find({})
    .toArray();
  expect(result).toEqual([testData[0], testData[2], testData[3]]);
});
