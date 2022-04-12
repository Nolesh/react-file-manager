/**
 * Extracts files from folder
 * Inspired by https://github.com/react-dropzone/file-selector/blob/master/src/file-selector.ts
 */

type TFileArray = Array<TFileValue>;
type TFileValue = File | TFileArray[];

const FILES_TO_IGNORE = [
    // Thumbnail cache files for macOS and Windows
    '.DS_Store', // macOs
    'Thumbs.db', // Windows
];

export async function getDataTransferFiles(e: React.DragEvent) {
    const dataTransfer = e && e.dataTransfer;

    if (dataTransfer && dataTransfer.items) {
        const items = Array.from(dataTransfer.items).filter((item) => item.kind === 'file');
        const files = await Promise.all(items.map(toFilePromises));
        return noIgnoredFiles(flatten<File>(files));
    } else if (dataTransfer && dataTransfer.files)
        return noIgnoredFiles(flatten<File>(Array.from(dataTransfer.files)));
    else return [];
}

function toFilePromises(item: DataTransferItem) {
    if (typeof item.webkitGetAsEntry !== 'function') return fromDataTransferItem(item);

    const entry = item.webkitGetAsEntry();
    if (entry && entry.isDirectory) return fromDirEntry(entry) as any;

    return fromDataTransferItem(item);
}

function flatten<T>(items: any[]): T[] {
    return items.reduce(
        (acc, files) => [...acc, ...(Array.isArray(files) ? flatten(files) : [files])],
        []
    );
}

function fromDataTransferItem(item: DataTransferItem) {
    const file = item.getAsFile();
    if (!file) return Promise.reject(`${file} is not a File`);
    return Promise.resolve(file);
}

function noIgnoredFiles(files: File[]) {
    return files.filter((file) => FILES_TO_IGNORE.indexOf(file.name) === -1);
}

function fromDirEntry(entry: any) {
    const reader = entry.createReader();

    return new Promise<TFileArray[]>((resolve, reject) => {
        const entries: Promise<TFileValue[]>[] = [];

        function readEntries() {
            reader.readEntries(
                async (batch: any[]) => {
                    if (!batch.length) {
                        // Done reading directory
                        try {
                            const files = await Promise.all(entries);
                            resolve(files);
                        } catch (err) {
                            reject(err);
                        }
                    } else {
                        const items = Promise.all(batch.map(fromEntry));
                        entries.push(items);

                        readEntries();
                    }
                },
                (err: any) => {
                    reject(err);
                }
            );
        }

        readEntries();
    });
}

async function fromEntry(entry: any) {
    return entry.isDirectory ? fromDirEntry(entry) : fromFileEntry(entry);
}

async function fromFileEntry(entry: any) {
    return new Promise<File>((resolve, reject) => {
        entry.file(
            (file: any) => {
                resolve(file);
            },
            (err: any) => {
                reject(err);
            }
        );
    });
}
