// https://medium.com/swlh/how-to-mock-a-fetch-api-request-with-jest-and-typescript-bb6adf673a00
export function getGlobalObject<T>(): T {
    return (
        isNodeEnv()
            ? global
            : typeof window !== 'undefined'
            ? window
            : typeof self !== 'undefined'
            ? self
            : {}
    ) as T;
}

function isNodeEnv(): boolean {
    return (
        Object.prototype.toString.call(typeof process !== 'undefined' ? process : 0) ===
        '[object process]'
    );
}

// ----------------------------------------------------------------------------

export const mockCreateObjectURL = (returnedValue: string) => {
    const createObjectURL = (global.URL.createObjectURL = jest.fn(() => returnedValue));
    return {
        createObjectURL,
        mockRestore: () => createObjectURL.mockRestore(),
    };
};

class MockedAudio {
    src: string = null;
    duration: number = null;
    onloadedmetadata: () => void;
    onerror: (e: Error) => void;

    static initialValue = global.Audio;
    static init: (obj: MockedAudio) => void;
    static instances: MockedAudio[] = [];
    constructor() {
        if (MockedAudio.init) MockedAudio.init(this);
        MockedAudio.instances.push(this);
    }

    static mockRestore() {
        global.Audio = this.initialValue;
        MockedAudio.init = null;
        MockedAudio.instances = [];
    }
}

export const mockAudio = () => {
    return ((global.Audio as unknown) = MockedAudio);
};

// -----------------------------------------------------------------------------

export const localStorageImpl = {
    register: () => {
        let storage = (window as any).customLocalStorage;

        if (storage) {
            return {
                storage,
                methods: (window as any).customLocalStorageMethods,
            };
        }

        storage = (window as any).customLocalStorage = {} as any;

        const setItem = jest.spyOn(Storage.prototype, 'setItem');
        setItem.mockImplementation((key, value) => {
            storage[key] = value;
        });

        const getItem = jest.spyOn(Storage.prototype, 'getItem');
        getItem.mockImplementation((key) => {
            return storage[key];
        });

        const removeItem = jest.spyOn(Storage.prototype, 'removeItem');
        removeItem.mockImplementation((key) => {
            delete storage[key];
        });

        const methods = ((window as any).customLocalStorageMethods = {
            setItem,
            getItem,
            removeItem,
        });

        return {
            storage,
            methods,
        };
    },
    unregister: () => {
        const methods = (window as any).customLocalStorageMethods;
        if (methods) {
            const { setItem, getItem } = methods as {
                setItem: jest.SpyInstance<void, [key: string, value: string]>;
                getItem: jest.SpyInstance<string, [key: string]>;
            };
            setItem.mockReset();
            getItem.mockReset();
        }
        delete (window as any).customLocalStorageMethods;
        delete (window as any).customLocalStorage;
    },
};

// -----------------------------------------------------------------------------
// https://stackoverflow.com/questions/64587566/how-to-test-react-dropzone-with-jest-and-react-testing-library
export const wrapFilesToDataTransfer = (files: Array<File>) => ({
    dataTransfer: {
        files,
        items:
            files &&
            files.map((file) => ({
                kind: 'file',
                type: file.type,
                getAsFile: () => file,
            })),
        types: ['Files'],
    },
});

export const createEventWithFiles = (files: File[], eventType: string = null) => {
    const data = wrapFilesToDataTransfer(files);
    const event = new Event(eventType, { bubbles: true });
    return Object.assign(event, data);
};

export const mockFile = (name?: string, size?: number, mimeType?: string) => {
    name = name || 'mock.txt';
    size = size || 1024;
    mimeType = mimeType || 'plain/txt';

    const data = new Array(size + 1).join('a');

    return new File([data], name, { type: mimeType });
};

export const mockFileList = () => {
    class FakeFileList implements Iterable<File> {
        length: number;
        files: File[];
        constructor(...files: File[]) {
            this.length = files.length;
            this.files = files;
        }
        [Symbol.iterator]() {
            return this.files.values();
        }
    }

    const originalFileList = global.FileList;
    (global.FileList as unknown) = FakeFileList;

    const create = (...files: File[]) => new FakeFileList(...files) as unknown as FileList;

    const restore = () => {
        global.FileList = originalFileList;
    };

    return {
        create,
        restore,
    };
};
// -----------------------------------------------------------------------------

export const useCustomTimer = () => {
    type TFunc = { callback: () => void; ms: number };
    let time = 0;
    let timers: TFunc[] = [];
    let initTimers: TFunc[] = [];

    const setCustomTimer = (callback: () => void, ms = 0) => {
        if (ms <= time) {
            callback();
            return;
        }
        timers.push({ callback, ms });
        timers.sort((a, b) => a.ms - b.ms);

        initTimers = [];
        initTimers.push(...timers);
    };

    const advanceTimersByTime = (ms: number) => {
        time += ms;
        timers = timers.reduce((acc, val) => {
            if (val.ms <= time) {
                val.callback();
            } else acc.push(val);
            return acc;
        }, []);
    };

    const advanceTimersToNextTimer = () => {
        if (timers.length) advanceTimersByTime(timers[0].ms - time);
    };

    const reset = () => {
        time = 0;
        timers = [];
        timers.push(...initTimers);
    };

    return {
        setCustomTimer,
        advanceTimersByTime,
        advanceTimersToNextTimer,
        reset,
    };
};
