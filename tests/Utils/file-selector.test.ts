import { DragEvent } from 'react';

import { createEventWithFiles, mockFile as createFile } from '../MockData';
import { getDataTransferFiles } from '../../src/lib/Utils/file-selector';

type FileOrDirEntry = FileEntry | DirEntry;

interface FileEntry extends Entry {
    file(cb: (file: File) => void, errCb: (err: any) => void): void;
}

interface DirEntry extends Entry {
    createReader(): DirReader;
}

interface Entry {
    isDirectory: boolean;
    isFile: boolean;
}

interface DirReader {
    readEntries(cb: (entries: FileOrDirEntry[]) => void, errCb: (err: any) => void): void;
}

function dragEvtFromItems(items: DataTransferItem | DataTransferItem[], type = 'drop'): DragEvent {
    return {
        type,
        dataTransfer: {
            items: Array.isArray(items) ? items : [items],
        },
    } as any;
}

function dataTransferItemFromStr(str: string): DataTransferItem {
    return {
        kind: 'string',
        type: 'text/plain',
        getAsFile(): File {
            return null;
        },
        getAsString(cb: (data: string) => void) {
            return cb(str);
        },
    } as any;
}

function dataTransferItemFromEntry(entry: FileEntry | DirEntry, file?: File): DataTransferItem {
    return {
        kind: 'file',
        getAsFile() {
            return file;
        },
        webkitGetAsEntry: () => {
            return entry;
        },
    } as any;
}

function fileSystemFileEntryFromFile(file: File, err?: any): FileEntry {
    return {
        isDirectory: false,
        isFile: true,
        file(cb, errCb) {
            if (err) {
                errCb(err);
            } else {
                cb(file);
            }
        },
    };
}

function fileSystemDirEntryFromFile(
    files: FileOrDirEntry[],
    batchSize = 1,
    throwAfter = 0
): DirEntry {
    const copy = files.slice(0);
    const batches: FileOrDirEntry[][] = [];

    let current = 0;
    while (copy.length) {
        const length = copy.length;
        current += batchSize;
        const batch = copy.splice(0, current > length ? length : current);
        batches.push(batch);
    }

    return {
        isDirectory: true,
        isFile: false,
        createReader: () => {
            let cbCount = 0;

            return {
                readEntries(cb, errCb) {
                    const batch = batches[cbCount];
                    cbCount++;

                    if (throwAfter !== 0 && cbCount === throwAfter) {
                        errCb('Failed to read files');
                    }

                    if (batch) {
                        cb(batch);
                    } else {
                        cb([]);
                    }
                },
            };
        },
    };
}

describe('file-selector', () => {
    test('returns a Promise', async () => {
        const evt = createEventWithFiles([]);
        expect(getDataTransferFiles(evt as unknown as DragEvent)).toBeInstanceOf(Promise);
    });

    test('should return an empty array if the passed arg is not what we expect', async () => {
        // const evt = new Event('test');
        const files = await getDataTransferFiles({} as unknown as DragEvent);
        expect(files).toHaveLength(0);
    });

    test('should return the evt {target} {files} if the passed event is an input evt', async () => {
        const mockFile = createFile();
        const evt = createEventWithFiles([mockFile]);

        const files = await getDataTransferFiles(evt as unknown as DragEvent);

        expect(files).toHaveLength(1);
        expect(files.every((file) => file instanceof File)).toBe(true);

        const file = files[0];

        expect(file.name).toBe(mockFile.name);
        expect(file.type).toBe(mockFile.type);
        expect(file.size).toBe(mockFile.size);
    });

    test('should return {files} from DataTransfer if {items} is not defined (e.g. IE11)', async () => {
        const mockFile = createFile();
        const evt = createEventWithFiles([mockFile]);
        delete evt.dataTransfer.items;

        const files = await getDataTransferFiles(evt as unknown as DragEvent);
        expect(files).toHaveLength(1);
        expect(files.every((file) => file instanceof File)).toBe(true);

        const file = files[0];

        expect(file.name).toBe(mockFile.name);
        expect(file.type).toBe(mockFile.type);
        expect(file.size).toBe(mockFile.size);
    });

    test('skips DataTransfer {items} that are of kind "string"', async () => {
        const mockFile = createFile();
        const evt = createEventWithFiles([mockFile]);
        evt.dataTransfer.items.push(dataTransferItemFromStr('test'));

        const files = await getDataTransferFiles(evt as unknown as DragEvent);
        expect(files).toHaveLength(1);

        const file = files[0];

        expect(file.name).toBe(mockFile.name);
        expect(file.type).toBe(mockFile.type);
        expect(file.size).toBe(mockFile.size);
    });

    test('should return an empty array if the passed event is not a DragEvent', async () => {
        const evt = new Event('test');
        const files = await getDataTransferFiles(evt as unknown as DragEvent);
        expect(files).toHaveLength(0);
    });

    test('can read a tree of directories recursively and return a flat list of FileWithPath objects', async () => {
        const mockFiles = [
            createFile('a.json'),
            createFile('b.json'),
            createFile('c.json'),
            createFile('d.json'),
            createFile('e.json'),
        ];

        const [f1, f2, f3, f4, f5] = mockFiles;
        const [f6, f7] = [createFile('.DS_Store'), createFile('Thumbs.db')];
        const evt = dragEvtFromItems([
            dataTransferItemFromEntry(fileSystemFileEntryFromFile(f1), f1),
            dataTransferItemFromEntry(fileSystemFileEntryFromFile(f2), f2),
            dataTransferItemFromEntry(
                fileSystemDirEntryFromFile(
                    [
                        fileSystemFileEntryFromFile(f3),
                        fileSystemDirEntryFromFile([fileSystemFileEntryFromFile(f4)]),
                        fileSystemFileEntryFromFile(f5),
                    ],
                    2
                )
            ),
            dataTransferItemFromEntry(fileSystemFileEntryFromFile(f6), f6),
            dataTransferItemFromEntry(fileSystemFileEntryFromFile(f7), f7),
        ]);

        const items = await getDataTransferFiles(evt);

        expect(items).toHaveLength(5);
        expect(items.every((file) => file instanceof File)).toBe(true);
        expect(items).toEqual(mockFiles);
    });

    test('should throw if reading dir entries fails', async () => {
        const mockFiles = [createFile('a.json'), createFile('b.json')];
        const [f1, f2] = mockFiles;
        const evt = dragEvtFromItems([
            dataTransferItemFromEntry(
                fileSystemDirEntryFromFile(
                    [fileSystemFileEntryFromFile(f1), fileSystemFileEntryFromFile(f2)],
                    1,
                    1
                )
            ),
        ]);

        // expect.assertions(1);
        try {
            await getDataTransferFiles(evt);
            throw 'Getting the files should have failed';
        } catch (err) {
            expect(err).toEqual('Failed to read files');
        }
    });

    test('should throw if reading file entry fails', async () => {
        const mockFiles = [createFile('a.json'), createFile('b.json')];
        const [f1, f2] = mockFiles;
        const evt = dragEvtFromItems([
            dataTransferItemFromEntry(
                fileSystemDirEntryFromFile(
                    [
                        fileSystemFileEntryFromFile(f1),
                        fileSystemFileEntryFromFile(f2, 'smth went wrong'),
                    ],
                    1,
                    1
                )
            ),
        ]);

        try {
            await getDataTransferFiles(evt);
            throw 'Getting the files should have failed';
        } catch (err) {
            expect(err).toEqual('Failed to read files');
        }
    });

    test('should throw if DataTransferItem is not a File', () => {
        const evt = {
            type: 'drop',
            dataTransfer: {
                files: [] as any,
                items: [
                    {
                        kind: 'file',
                        type: '',
                        getAsFile(): File {
                            return null;
                        },
                    },
                ],
            },
        };

        return getDataTransferFiles(evt as unknown as DragEvent)
            .then(() => {
                throw 'Getting the files should have failed';
            })
            .catch((err) => {
                expect(err).toEqual('null is not a File');
            });
    });
});
