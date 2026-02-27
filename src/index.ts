import get from 'lodash.get';
import fsStreams from 'node:fs';
import fs from 'node:fs/promises';
import path from 'path';
import readline from 'readline';

export class Db {
  private dataDirectory: string;

  constructor(dataDirectory: string) {
    this.dataDirectory = dataDirectory;
  }

  /** Returns a Collection instance for the given name. */
  public collection<T extends Record<string, any> = Record<string, any>>(name: string) {
    return new Collection<T>(this.dataDirectory, name);
  }

  /** Lists the names of all collections in the database. */
  public async collections(): Promise<string[]> {
    const files = await fs.readdir(this.dataDirectory);
    return files.filter(f => f.endsWith('.ndjson')).map(f => f.slice(0, -7));
  }

  /**
   * Drops the entire database, permanently deleting all collections and their data.
   * The data directory is recreated empty afterward.
   */
  public async drop(): Promise<void> {
    await fs.rm(this.dataDirectory, { recursive: true, force: true });
    await fs.mkdir(this.dataDirectory, { recursive: true });
  }
}

const createFileIfDoesntExist = async (filePath: string) => {
  try {
    const fileHandle = await fs.open(filePath, 'wx');
    await fileHandle.close();
  } catch (e: any) {
    if (e.code !== 'EEXIST') {
      throw e;
    }
  }
};

const applyQuery = (query: Record<string, any>, entry: Record<string, any>) =>
  Object.entries(query).every(([key, value]) => get(entry, key) === value);

export class Collection<T extends Record<string, any> = Record<string, any>> {
  private collectionFile: string;

  constructor(dataDirectory: string, name: string) {
    this.collectionFile = path.join(dataDirectory, name + '.ndjson');
  }

  /**
   * Finds all documents matching the query.
   *
   * Returns an object that supports both `.toArray()` and async iteration,
   * allowing memory-efficient streaming of large collections.
   *
   * @example
   * // Collect all results at once
   * const docs = await collection.find({ country: 'DE' }).toArray();
   *
   * @example
   * // Stream results one at a time
   * for await (const doc of collection.find({ country: 'DE' })) {
   *   console.log(doc);
   * }
   */
  public find(query: Partial<T>) {
    const collectionFile = this.collectionFile;

    async function* iterate() {
      await createFileIfDoesntExist(collectionFile);
      const readInterface = readline.createInterface({
        input: fsStreams.createReadStream(collectionFile),
        crlfDelay: Infinity,
      });
      for await (const line of readInterface) {
        if (!line) continue;
        const entry: T = JSON.parse(line);
        if (applyQuery(query, entry)) {
          yield entry;
        }
      }
    }

    return {
      [Symbol.asyncIterator]: iterate,
      toArray: async () => {
        const result: T[] = [];
        for await (const doc of iterate()) {
          result.push(doc);
        }
        return result;
      },
    };
  }

  /**
   * Finds the first document matching the query.
   * Returns `undefined` if no match is found.
   */
  public async findOne(query: Partial<T>) {
    await createFileIfDoesntExist(this.collectionFile);
    const readInterface = readline.createInterface({
      input: fsStreams.createReadStream(this.collectionFile)
    });
    return new Promise<T | undefined>(resolve =>
      readInterface
        .on('line', line => {
          const entry: T = JSON.parse(line);
          if (applyQuery(query, entry)) {
            resolve(entry);
            readInterface.close();
          }
        })
        .on('close', () => resolve(undefined))
    );
  }

  /**
   * Inserts multiple documents into the collection.
   * Returns the inserted documents.
   */
  public async insertMany(documents: T[]) {
    await createFileIfDoesntExist(this.collectionFile);
    await fs.appendFile(this.collectionFile, documents.map(entry => JSON.stringify(entry) + '\n').join(''));
    return documents;
  }

  /**
   * Inserts a single document into the collection.
   * Returns the inserted document.
   */
  public async insertOne(document: T) {
    await createFileIfDoesntExist(this.collectionFile);
    await fs.appendFile(this.collectionFile, JSON.stringify(document) + '\n');
    return document;
  }

  /**
   * Updates the first document matching the query with the provided document.
   * Returns the updated document.
   */
  public async update(query: Partial<T>, document: T) {
    await createFileIfDoesntExist(this.collectionFile);
    const readInterface = readline.createInterface({
      input: fsStreams.createReadStream(this.collectionFile)
    });
    const tempCollectionFile = this.collectionFile.slice(0, -7) + '.temp.ndjson';
    const writeStream = fsStreams.createWriteStream(tempCollectionFile);
    await new Promise<void>(resolve =>
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
          resolve();
        })
    );
    await fs.rename(tempCollectionFile, this.collectionFile);
    return document;
  }

  /**
   * Deletes all documents matching the query.
   * Returns the number of deleted documents.
   */
  public async delete(query: Partial<T>) {
    await createFileIfDoesntExist(this.collectionFile);
    const readInterface = readline.createInterface({
      input: fsStreams.createReadStream(this.collectionFile)
    });
    const tempCollectionFile = this.collectionFile.slice(0, -7) + '.temp.ndjson';
    let affected = 0;
    const writeStream = fsStreams.createWriteStream(tempCollectionFile);
    await new Promise<void>(resolve =>
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
          resolve();
        })
    );
    await fs.rename(tempCollectionFile, this.collectionFile);
    return affected;
  }

  /**
   * Drops the collection by deleting its file.
   * The collection file will be recreated automatically on next use.
   */
  public async drop(): Promise<void> {
    try {
      await fs.unlink(this.collectionFile);
    } catch (e: any) {
      if (e.code !== 'ENOENT') {
        throw e;
      }
    }
  }
}

/**
 * Initializes a BumbleDB database at the given directory.
 * Creates the directory if it doesn't exist.
 *
 * @example
 * const db = await initializeDb('.data');
 * const users = db.collection<User>('users');
 */
const initializeDb = async (dataDirectory: string) => {
  await fs.mkdir(dataDirectory, { recursive: true });
  return new Db(dataDirectory);
};

export default initializeDb;
