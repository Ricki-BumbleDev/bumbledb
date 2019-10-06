import { sync as remove } from 'rimraf';
import { BumbleClient } from '../../src';
import config from './config';
import testData from './test-data';

export const cleanup = () => remove(config.dataDirectory);

export const getEmptyDb = () => BumbleClient.connect(config.dataDirectory);

export const getDbWithTestData = async () => {
  const db = await getEmptyDb();
  await db.collection('test').insertMany(testData);
  return db;
};
