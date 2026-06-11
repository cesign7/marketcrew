import { Buffer } from "node:buffer";

export type ProductImageStudioZipEntry = {
  readonly bytes: Uint8Array;
  readonly path: string;
};

type PreparedZipEntry = ProductImageStudioZipEntry & {
  readonly crc32: number;
  readonly offset: number;
};

const LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;
const CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
const END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;
const UTF8_FILE_NAME_FLAG = 0x0800;
const STORED_COMPRESSION_METHOD = 0;

export function createStoredZipArchive(entries: readonly ProductImageStudioZipEntry[]): Uint8Array {
  const localParts: Buffer[] = [];
  const preparedEntries: PreparedZipEntry[] = [];
  let offset = 0;

  for (const entry of entries) {
    const crc32 = calculateCrc32(entry.bytes);
    const localHeader = createLocalFileHeader(entry.path, entry.bytes.byteLength, crc32);
    localParts.push(localHeader, Buffer.from(entry.bytes));
    preparedEntries.push({ ...entry, crc32, offset });
    offset += localHeader.byteLength + entry.bytes.byteLength;
  }

  const centralParts = preparedEntries.map(createCentralDirectoryHeader);
  const centralDirectorySize = sumBufferLengths(centralParts);
  const end = createEndOfCentralDirectory(preparedEntries.length, centralDirectorySize, offset);

  return Buffer.concat([...localParts, ...centralParts, end]);
}

function createLocalFileHeader(path: string, size: number, crc32: number): Buffer {
  const pathBytes = Buffer.from(path, "utf8");
  const header = Buffer.alloc(30 + pathBytes.byteLength);
  header.writeUInt32LE(LOCAL_FILE_HEADER_SIGNATURE, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(UTF8_FILE_NAME_FLAG, 6);
  header.writeUInt16LE(STORED_COMPRESSION_METHOD, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(0, 12);
  header.writeUInt32LE(crc32, 14);
  header.writeUInt32LE(size, 18);
  header.writeUInt32LE(size, 22);
  header.writeUInt16LE(pathBytes.byteLength, 26);
  header.writeUInt16LE(0, 28);
  pathBytes.copy(header, 30);
  return header;
}

function createCentralDirectoryHeader(entry: PreparedZipEntry): Buffer {
  const pathBytes = Buffer.from(entry.path, "utf8");
  const header = Buffer.alloc(46 + pathBytes.byteLength);
  header.writeUInt32LE(CENTRAL_DIRECTORY_SIGNATURE, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(20, 6);
  header.writeUInt16LE(UTF8_FILE_NAME_FLAG, 8);
  header.writeUInt16LE(STORED_COMPRESSION_METHOD, 10);
  header.writeUInt16LE(0, 12);
  header.writeUInt16LE(0, 14);
  header.writeUInt32LE(entry.crc32, 16);
  header.writeUInt32LE(entry.bytes.byteLength, 20);
  header.writeUInt32LE(entry.bytes.byteLength, 24);
  header.writeUInt16LE(pathBytes.byteLength, 28);
  header.writeUInt16LE(0, 30);
  header.writeUInt16LE(0, 32);
  header.writeUInt16LE(0, 34);
  header.writeUInt16LE(0, 36);
  header.writeUInt32LE(0, 38);
  header.writeUInt32LE(entry.offset, 42);
  pathBytes.copy(header, 46);
  return header;
}

function createEndOfCentralDirectory(entryCount: number, centralDirectorySize: number, centralDirectoryOffset: number): Buffer {
  const header = Buffer.alloc(22);
  header.writeUInt32LE(END_OF_CENTRAL_DIRECTORY_SIGNATURE, 0);
  header.writeUInt16LE(0, 4);
  header.writeUInt16LE(0, 6);
  header.writeUInt16LE(entryCount, 8);
  header.writeUInt16LE(entryCount, 10);
  header.writeUInt32LE(centralDirectorySize, 12);
  header.writeUInt32LE(centralDirectoryOffset, 16);
  header.writeUInt16LE(0, 20);
  return header;
}

function calculateCrc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ byte) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function buildCrc32Table(): readonly number[] {
  const table: number[] = [];
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table.push(value >>> 0);
  }
  return table;
}

function sumBufferLengths(buffers: readonly Buffer[]): number {
  return buffers.reduce((sum, buffer) => sum + buffer.byteLength, 0);
}

const CRC32_TABLE = buildCrc32Table();
