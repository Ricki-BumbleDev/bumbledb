import { createReadStream, createWriteStream, promises as fs } from 'fs';
import get from 'lodash.get';
import path from 'path';
import readline from 'readline';

export class Db {
  private dataDirectory: string;

  constructor(dataDirectory: string) {
    this.dataDirectory = dataDirectory;
  }

  public collection(name: string) {
    return new Collection(this.dataDirectory, name);
  }
}

const createFileIfDoesntExist = async (filePath: string) => {
  try {
    const fileHandle = await fs.open(filePath, 'wx');
    await fileHandle.close();
  } catch (e) {
    if (e.code !== 'EEXIST') {
      throw e;
    }
  }
};

const applyQuery = (query: Record<string, any>, entry: Record<string, any>) =>
  Object.entries(query).every(([key, value]) => get(entry, key) === value);

export class Collection {
  private collectionFile: string;

  constructor(dataDirectory: string, name: string) {
    this.collectionFile = path.join(dataDirectory, name + '.ndjson');
  }

  public find<T extends Record<string, any> = Record<string, any>>(query: Partial<T>) {
    return {
      toArray: async () => {
        await createFileIfDoesntExist(this.collectionFile);
        const readInterface = readline.createInterface({
          input: createReadStream(this.collectionFile)
        });
        const result: T[] = [];
        readInterface.on('line', line => {
          const entry = JSON.parse(line);
          if (applyQuery(query, entry)) {
            result.push(JSON.parse(line));
          }
        });
        return new Promise<T[]>(resolve => {
          readInterface.on('close', () => resolve(result));
        });
      }
    };
  }

  public async findOne<T extends Record<string, any> = Record<string, any>>(query: Partial<T>) {
    await createFileIfDoesntExist(this.collectionFile);
    const readInterface = readline.createInterface({
      input: createReadStream(this.collectionFile)
    });
    return new Promise(resolve =>
      readInterface
        .on('line', line => {
          const entry = JSON.parse(line);
          if (applyQuery(query, entry)) {
            resolve(entry);
            readInterface.close();
          }
        })
        .on('close', () => resolve(null))
    );
  }

  public async insertMany(documents: any[]) {
    await createFileIfDoesntExist(this.collectionFile);
    await fs.appendFile(this.collectionFile, documents.map(entry => JSON.stringify(entry) + '\n').join(''));
    return documents;
  }

  public async insertOne(document: any) {
    await createFileIfDoesntExist(this.collectionFile);
    await fs.appendFile(this.collectionFile, JSON.stringify(document) + '\n');
    return document;
  }

  public async update<T extends Record<string, any> = Record<string, any>>(query: Partial<T>, document: any) {
    await createFileIfDoesntExist(this.collectionFile);
    const readInterface = readline.createInterface({
      input: createReadStream(this.collectionFile)
    });
    const tempCollectionFile = this.collectionFile.slice(0, -7) + '.temp.ndjson';
    const writeStream = createWriteStream(tempCollectionFile);
    await new Promise(resolve =>
      readInterface
        .on('line', line => {
          const entry = JSON.parse(line);
          if (applyQuery(query, entry)) {
            writeStream.write(JSON.stringify(document) + '\n');
          } else {
            writeStream.write(line + '\n');
          }
        })
        .on('close', () => {
          writeStream.close();
          resolve(undefined);
        })
    );
    await fs.rename(tempCollectionFile, this.collectionFile);
    return document;
  }

  public async delete<T extends Record<string, any> = Record<string, any>>(query: Partial<T>) {
    await createFileIfDoesntExist(this.collectionFile);
    const readInterface = readline.createInterface({
      input: createReadStream(this.collectionFile)
    });
    const tempCollectionFile = this.collectionFile.slice(0, -6) + '.temp.ndjson';
    let affected = 0;
    const writeStream = createWriteStream(tempCollectionFile);
    await new Promise(resolve =>
      readInterface
        .on('line', line => {
          const entry = JSON.parse(line);
          if (applyQuery(query, entry)) {
            affected++;
          } else {
            writeStream.write(line + '\n');
          }
        })
        .on('close', () => {
          writeStream.close();
          resolve(undefined);
        })
    );
    await fs.rename(tempCollectionFile, this.collectionFile);
    return affected;
  }
}

const initializeDb = async (dataDirectory: string) => {
  await fs.mkdir(dataDirectory, { recursive: true });
  return new Db(dataDirectory);
};

export default initializeDb;
