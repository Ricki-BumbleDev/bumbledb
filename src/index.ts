import { createReadStream, createWriteStream, promises as fs, rename } from 'fs';
import get from 'lodash.get';
import path from 'path';
import readline from 'readline';

export class BumbleClient {
  public static async connect(dataDirectory: string) {
    try {
      await fs.mkdir(dataDirectory);
    } catch (e) {
      if (e.code !== 'EEXIST') {
        throw e;
      }
    }
    return new Db(dataDirectory);
  }
}

export class Db {
  private dataDirectory: string;

  constructor(dataDirectory: string) {
    this.dataDirectory = dataDirectory;
  }

  public collection(name: string) {
    return new Collection(this.dataDirectory, name);
  }
}

export class Collection {
  private collectionFile: string;

  constructor(dataDirectory: string, name: string) {
    this.collectionFile = path.join(dataDirectory, name + '.jsonl');
  }

  private async createFileIfDoesntExist() {
    try {
      const fileHandle = await fs.open(this.collectionFile, 'wx');
      await fileHandle.close();
    } catch (e) {
      if (e.code !== 'EEXIST') {
        throw e;
      }
    }
  }

  private applyQuery(query: Record<string, any>, entry: Record<string, any>) {
    return !Object.entries(query).find(([key, value]) => get(entry, key) !== value);
  }

  public find<T extends Record<string, any> = Record<string, any>>(query: Partial<T>) {
    return {
      toArray: async () => {
        await this.createFileIfDoesntExist();
        const readInterface = readline.createInterface({
          input: createReadStream(this.collectionFile)
        });
        const result: T[] = [];
        readInterface.on('line', line => {
          const entry = JSON.parse(line);
          if (this.applyQuery(query, entry)) {
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
    await this.createFileIfDoesntExist();
    const readInterface = readline.createInterface({
      input: createReadStream(this.collectionFile)
    });
    return new Promise(resolve =>
      readInterface
        .on('line', line => {
          const entry = JSON.parse(line);
          if (this.applyQuery(query, entry)) {
            resolve(entry);
            readInterface.close();
          }
        })
        .on('close', () => resolve(null))
    );
  }

  public async insertMany(documents: any[]) {
    await this.createFileIfDoesntExist();
    await fs.appendFile(this.collectionFile, documents.map(entry => JSON.stringify(entry) + '\n').join(''));
    return documents;
  }

  public async insertOne(document: any) {
    await this.createFileIfDoesntExist();
    await fs.appendFile(this.collectionFile, JSON.stringify(document) + '\n');
    return document;
  }

  public async update<T extends Record<string, any> = Record<string, any>>(query: Partial<T>, document: any) {
    await this.createFileIfDoesntExist();
    const readInterface = readline.createInterface({
      input: createReadStream(this.collectionFile)
    });
    const tempCollectionFile = this.collectionFile.slice(0, -6) + '.temp.jsonl';
    const writeStream = createWriteStream(tempCollectionFile);
    await new Promise(resolve =>
      readInterface
        .on('line', line => {
          const entry = JSON.parse(line);
          if (this.applyQuery(query, entry)) {
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

  public async delete<T extends Record<string, any> = Record<string, any>>(query: Partial<T>) {
    await this.createFileIfDoesntExist();
    const readInterface = readline.createInterface({
      input: createReadStream(this.collectionFile)
    });
    const tempCollectionFile = this.collectionFile.slice(0, -6) + '.temp.jsonl';
    let affected = 0;
    const writeStream = createWriteStream(tempCollectionFile);
    await new Promise(resolve =>
      readInterface
        .on('line', line => {
          const entry = JSON.parse(line);
          if (this.applyQuery(query, entry)) {
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
}
