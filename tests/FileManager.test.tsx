import React from 'react';

import '@testing-library/jest-dom';
import {
    act,
    render,
    fireEvent,
    waitFor,
    screen,
    within,
    waitForElementToBeRemoved,
} from '@testing-library/react';

import {
    localStorageImpl,
    createEventWithFiles,
    mockFile,
    mockAudio,
    mockCreateObjectURL,
    useCustomTimer,
    mockFileList,
} from './MockData';
import { SameType } from '../src/lib/Utils/types';
import * as utils from '../src/lib/Utils';

import FileManager, { IFileManagerRef, IFileManagerProps, TFileValidator } from '../src/lib';
import { IFileData, ILocalFileData, IRemoteFileData } from '../src/lib/FileItemComponent';
import { errorTxtInvalidFileFields, errorTxtUploadedFilesNotArray } from '../src/lib/Utils/errors';
import ErrorBoundary from './ErrorBoundary';

const simpleResponse = [
    {
        uid: '18c27',
        fileName: 'readOnly.pdf',
        fileSize: 77123,
        fileType: 'PDF',
        description: 'Readme',
        readOnly: true,
        disabled: false,
    },
    {
        uid: '124ad',
        fileName: 'sound.mp3',
        fileSize: 155873,
        fileType: 'MPEG',
        description: 'Melody',
        readOnly: false,
        disabled: false,
    },
];

const getErrorMessage = (e: any) => e.message;

let errorId: any = null;
const handleErrors: IFileManagerProps['onError'] = jest.fn((err) => {
    // console.log('err', err);
    if (Array.isArray(err)) {
        if (err.length === 1) errorId = err[0].errorId;
        else errorId = err.map((x) => x.errorId);
    } else errorId = err.errorId;
});

let acceptedFiles: File[] = [];
let fileRejections: Parameters<IFileManagerProps['onDropFiles']>[1] = [];
const handleDropFiles: IFileManagerProps['onDropFiles'] = jest.fn(
    (_acceptedFiles, _fileRejections) => {
        acceptedFiles = _acceptedFiles;
        fileRejections = _fileRejections;
    }
);

const processResponseSimple = jest.fn((response) => {
    // console.log('resp',response)
    return response;
});

let managerRef: React.RefObject<IFileManagerRef> = null;
let root: HTMLElement = null;

const Manager = (props: Partial<IFileManagerProps>) => {
    managerRef = React.useRef();

    const request = (url: string, method = 'GET', body: object | null = null): Promise<any> => {
        return fetch(`/api/${url}`, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            ...(body ? { body: JSON.stringify(body) } : {}),
        }).then(async (response) => {
            if (!response.ok) {
                const errorInfo = await response.json();
                // console.log('errorInfo', errorInfo);
                return Promise.reject('test-error');
            }
            return Promise.resolve(response);
        });
    };

    return (
        <FileManager
            ref={managerRef}
            getRoot={(el) => (root = el)}
            fetchRemoteFiles={() => request('fetchFiles').then((res) => res.json())}
            getUploadParams={(files) => ({
                URL: `/api/singleFileUpload`,
                processResponse: processResponseSimple,
                processError: getErrorMessage,
            })}
            onError={handleErrors}
            onDropFiles={handleDropFiles}
            // onUnmountComponent={(root) => { console.log('unmount', !!root) }}
            overrides={{
                Root: {
                    texts: {
                        loading: 'loading',
                        defaultText: 'dragNdrop',
                        dragActiveAccept: 'dragNdropAccept',
                        dragActiveReject: 'dragNdropReject',
                    },
                },
                FileItem: {
                    titles: {
                        cancelUpload: 'cancelUpload',
                        uploadFile: 'upload',
                    },
                },
            }}
            {...props}
        />
    );
};

// beforeAll(() => {
//     const mockSuccessResponse = simpleResponse;
//     const mockJsonPromise = Promise.resolve(mockSuccessResponse);
//     const mockFetchPromise = Promise.resolve({
//         status: 200,
//         json: () => mockJsonPromise,
//     });
//     global.fetch = jest.fn().mockImplementation(() => mockFetchPromise);
// })

beforeEach(() => {
    jest.useFakeTimers();
    acceptedFiles = [];
    fileRejections = [];
    errorId = null;
});

function mockFetch(ok: boolean, status: number, data?: { [key: string]: any }, delay?: number) {
    const response = { ok, status, json: () => Promise.resolve(data) };
    const mockFetchPromise = delay
        ? new Promise((resolve) =>
              setTimeout(() => {
                  resolve(response);
              }, delay)
          )
        : Promise.resolve(response);

    global.fetch = jest.fn().mockImplementation(() => mockFetchPromise);
}

const mockSubmitFormData = (
    promise: Promise<string> = new Promise((res) => setTimeout(() => res(null))),
    xhr: XMLHttpRequest = null
) => {
    const spy = jest.spyOn(utils, 'submitFormData');
    spy.mockImplementation((url, formData, opts) => {
        return {
            // promise: Promise.resolve(''),
            promise,
            xhr,
        };
    });
    return spy;
};

const mockResponse = (fileCount = 0) => {
    const resp: IFileData[] = [];
    for (let i = 1; i <= fileCount; i++)
        resp.push({ fileName: `file${i}.txt`, fileSize: 1024 * i });
    processResponseSimple.mockImplementationOnce(() => (resp.length ? resp : null));
};

const mockFormData = () => {
    const originalFormData = global.FormData;
    const formDataFields: { [key: string]: any } = {};

    function formDataMock() {
        this.append = jest.fn((key, val) => {
            formDataFields[key] = val;
        });
    }
    global.FormData = formDataMock as any;

    const restore = () => {
        global.FormData = originalFormData;
    };

    return {
        restore,
        formDataFields,
    };
};

const setObserverToNull = () => {
    const observer = window.IntersectionObserver;
    window.IntersectionObserver = undefined;
    const spy = jest.spyOn(console, 'info').mockImplementation(() => {});
    return () => ((window.IntersectionObserver = observer), spy.mockRestore());
};

describe('FileManager sorting', () => {
    let storage: any;
    beforeEach(() => {
        mockFetch(true, 200, simpleResponse);
        storage = localStorageImpl.register().storage;
    });

    afterEach(() => {
        localStorageImpl.unregister();
    });

    test('should test basic sorting', async () => {
        const { getByRole, getByTestId, findByTestId, queryAllByTestId, queryAllByRole } = render(
            <Manager />
        );

        await findByTestId('file-container');

        expect(within(queryAllByRole('thumbnail')[0]).getByText('MPEG')).toBeInTheDocument();
        expect(within(queryAllByRole('thumbnail')[1]).getByText('PDF')).toBeInTheDocument();

        fireEvent.click(getByTestId('column-type'));

        expect(within(queryAllByRole('thumbnail')[0]).getByText('PDF')).toBeInTheDocument();
        expect(within(queryAllByRole('thumbnail')[1]).getByText('MPEG')).toBeInTheDocument();

        expect(queryAllByRole('filesize')[0].innerHTML).toEqual('75 kB');
        expect(queryAllByRole('filesize')[1].innerHTML).toEqual('152 kB');

        fireEvent.click(getByTestId('column-size'));

        expect(queryAllByRole('filesize')[0].innerHTML).toEqual('152 kB');
        expect(queryAllByRole('filesize')[1].innerHTML).toEqual('75 kB');

        expect(queryAllByTestId('read-only-text')[0].innerHTML).toEqual('Melody');
        expect(queryAllByTestId('read-only-text')[1].innerHTML).toEqual('Readme');

        fireEvent.click(getByTestId('column-name'));

        expect(queryAllByTestId('read-only-text')[0].innerHTML).toEqual('Readme');
        expect(queryAllByTestId('read-only-text')[1].innerHTML).toEqual('Melody');
        jest.runAllTimers();
    });

    test('should separate local and remote files or mixes them together', async () => {
        const { getByRole, getByTestId, findByTestId, queryAllByTestId, queryAllByRole } = render(
            <Manager />
        );

        await findByTestId('file-container');

        const input = getByRole('fileinput', { hidden: true }) as HTMLInputElement;
        const file = mockFile('NewLocal.txt');
        fireEvent.change(input, { target: { files: [file] } });

        await waitFor(() => expect(queryAllByRole('fileitem').length).toEqual(3));

        // local files should be placed after remote files (desc)
        expect(queryAllByTestId('read-only-text')[0].innerHTML).toEqual('Melody');
        expect(queryAllByTestId('read-only-text')[1].innerHTML).toEqual('Readme');
        expect(queryAllByTestId('read-only-text')[2].innerHTML).toEqual('NewLocal.txt');

        // sort by name - only the order of the remote files should be changed
        fireEvent.click(getByTestId('column-name'));

        expect(queryAllByTestId('read-only-text')[0].innerHTML).toEqual('Readme');
        expect(queryAllByTestId('read-only-text')[1].innerHTML).toEqual('Melody');
        expect(queryAllByTestId('read-only-text')[2].innerHTML).toEqual('NewLocal.txt');

        // local files should be placed between remote files (mix)
        fireEvent.click(getByTestId('column-sort-file-mode'));

        expect(queryAllByTestId('read-only-text')[0].innerHTML).toEqual('Readme');
        expect(queryAllByTestId('read-only-text')[1].innerHTML).toEqual('NewLocal.txt');
        expect(queryAllByTestId('read-only-text')[2].innerHTML).toEqual('Melody');

        // all files should be sorted by name
        fireEvent.click(getByTestId('column-name'));

        expect(queryAllByTestId('read-only-text')[0].innerHTML).toEqual('Melody');
        expect(queryAllByTestId('read-only-text')[1].innerHTML).toEqual('NewLocal.txt');
        expect(queryAllByTestId('read-only-text')[2].innerHTML).toEqual('Readme');

        // local files should be placed before remote files (asc)
        fireEvent.click(getByTestId('column-sort-file-mode'));

        expect(queryAllByTestId('read-only-text')[0].innerHTML).toEqual('NewLocal.txt');
        expect(queryAllByTestId('read-only-text')[1].innerHTML).toEqual('Melody');
        expect(queryAllByTestId('read-only-text')[2].innerHTML).toEqual('Readme');

        // sort by name - only the order of the remote files should be changed
        fireEvent.click(getByTestId('column-name'));

        expect(queryAllByTestId('read-only-text')[0].innerHTML).toEqual('NewLocal.txt');
        expect(queryAllByTestId('read-only-text')[1].innerHTML).toEqual('Readme');
        expect(queryAllByTestId('read-only-text')[2].innerHTML).toEqual('Melody');
        jest.runAllTimers();
    });

    test('should freeze sort order during file renaming', async () => {
        const { getByRole, getByTestId, findByTestId, findByRole, queryAllByRole } = render(
            <Manager addFileDescription setFileDescription={() => Promise.reject()} />
        );

        await findByTestId('file-container');

        const input = getByRole('fileinput', { hidden: true }) as HTMLInputElement;
        const file = mockFile('NewLocal.txt');
        fireEvent.change(input, { target: { files: [file] } });

        await waitFor(() => expect(queryAllByRole('fileitem').length).toEqual(3));

        // local files should be placed between remote files (mix)
        fireEvent.click(getByTestId('column-sort-file-mode'));

        expect(within(queryAllByRole('fileitem')[0]).queryByTitle('sound.mp3')).not.toBeNull();
        expect(within(queryAllByRole('fileitem')[1]).queryByTitle('NewLocal.txt')).not.toBeNull();
        expect(within(queryAllByRole('fileitem')[2]).queryByTitle('readOnly.pdf')).not.toBeNull();

        // set focus to change local file description
        const textbox = within(queryAllByRole('fileitem')[1]).getByRole('textbox');
        textbox.focus();

        // try to change sort order
        fireEvent.click(getByTestId('column-sort-file-mode'));

        expect(within(queryAllByRole('fileitem')[0]).queryByTitle('sound.mp3')).not.toBeNull();
        expect(within(queryAllByRole('fileitem')[1]).queryByTitle('NewLocal.txt')).not.toBeNull();
        expect(within(queryAllByRole('fileitem')[2]).queryByTitle('readOnly.pdf')).not.toBeNull();

        // releasing focus from the textbox unfreezes the sort order
        textbox.blur();

        expect(within(queryAllByRole('fileitem')[0]).queryByTitle('NewLocal.txt')).not.toBeNull();
        expect(within(queryAllByRole('fileitem')[1]).queryByTitle('sound.mp3')).not.toBeNull();
        expect(within(queryAllByRole('fileitem')[2]).queryByTitle('readOnly.pdf')).not.toBeNull();

        // rename remote file
        act(() => {
            within(queryAllByRole('fileitem')[1]).getByRole('button').click();
        });

        getByRole('menuitem').click();

        // attempt to sort files by name should be ignored
        fireEvent.click(getByTestId('column-name'));

        expect(within(queryAllByRole('fileitem')[1]).queryByTitle('sound.mp3')).not.toBeNull();
        expect(within(queryAllByRole('fileitem')[2]).queryByTitle('readOnly.pdf')).not.toBeNull();

        // click on cancel or OK buttons unfreezes the sort order
        within(queryAllByRole('fileitem')[1]).getAllByRole('button')[1].click(); // cancel

        expect(within(queryAllByRole('fileitem')[1]).queryByTitle('readOnly.pdf')).not.toBeNull();
        expect(within(queryAllByRole('fileitem')[2]).queryByTitle('sound.mp3')).not.toBeNull();
        jest.runAllTimers();
    });

    test('should sort all files according to sortFiles property', async () => {
        const { rerender, getByRole, getByTestId, findByTestId, findByRole, queryAllByRole } =
            render(<Manager />);

        await findByTestId('file-container');

        const input = getByRole('fileinput', { hidden: true }) as HTMLInputElement;
        const file = mockFile('NewLocal.txt');
        fireEvent.change(input, { target: { files: [file] } });

        await waitFor(() => expect(queryAllByRole('fileitem').length).toEqual(3));

        // sort files by name
        fireEvent.click(getByTestId('column-type'));

        expect(within(queryAllByRole('fileitem')[0]).queryByTitle('readOnly.pdf')).not.toBeNull();
        expect(within(queryAllByRole('fileitem')[1]).queryByTitle('sound.mp3')).not.toBeNull();
        expect(within(queryAllByRole('fileitem')[2]).queryByTitle('NewLocal.txt')).not.toBeNull();

        // override default sorting (sort by file size)
        rerender(<Manager sortFiles={(a, b) => a.fileData.fileSize - b.fileData.fileSize} />);

        expect(within(queryAllByRole('fileitem')[0]).queryByTitle('NewLocal.txt')).not.toBeNull();
        expect(within(queryAllByRole('fileitem')[1]).queryByTitle('readOnly.pdf')).not.toBeNull();
        expect(within(queryAllByRole('fileitem')[2]).queryByTitle('sound.mp3')).not.toBeNull();

        jest.runAllTimers();
    });
});

describe('FileManager preview', () => {
    let restoreObserver: ReturnType<typeof setObserverToNull>;

    beforeEach(() => {
        mockFetch(true, 200, []);
        restoreObserver = setObserverToNull();
    });

    afterEach(() => {
        restoreObserver();
        jest.clearAllTimers();
    });

    test('should render default image preview', async () => {
        // https://stackoverflow.com/questions/59312671/mock-only-one-function-from-module-but-leave-rest-with-original-functionality
        const spy = jest.spyOn(utils, 'generateImageThumbnail');
        spy.mockImplementation(() => Promise.resolve('image-src'));

        const { getByRole, queryAllByRole, findByText } = render(<Manager />);

        await findByText('dragNdrop');

        const input = getByRole('fileinput', { hidden: true }) as HTMLInputElement;
        const file = mockFile('img.png', 10 * 1024, 'image/png');
        fireEvent.change(input, { target: { files: [file] } });

        await waitFor(() => expect(queryAllByRole('fileitem').length).toEqual(1));
        expect(getByRole('imagelazyloader')).toBeInTheDocument();
        expect(
            within(getByRole('imagelazyloader')).getByRole('img', { hidden: true })
        ).toHaveAttribute('src', 'image-src');

        spy.mockRestore();
    });

    test('should render a fallback if an error occurs during image preview creation', async () => {
        const spy = jest.spyOn(utils, 'generateImageThumbnail');
        spy.mockImplementation(() =>
            Promise.reject({ data: { type: 'abort' }, message: 'warn on abort' })
        );

        let err = null;
        const spyConsoleWarn = jest.spyOn(console, 'warn').mockImplementation((val) => {
            err = val;
        });
        const spyConsoleErr = jest.spyOn(console, 'error').mockImplementation((val, data) => {
            err = { val, data };
        });

        const { getByRole, queryAllByRole, findByText } = render(<Manager />);

        await findByText('dragNdrop');

        const input = getByRole('fileinput', { hidden: true }) as HTMLInputElement;
        let file = mockFile('img.png', 10 * 1024, 'image/png');
        fireEvent.change(input, { target: { files: [file] } });

        await waitFor(() => expect(queryAllByRole('fileitem').length).toEqual(1));
        expect(err).toBe('warn on abort');
        expect(queryAllByRole('imagelazyloader').length).toBe(0);
        expect(queryAllByRole('thumbnail').length).toBe(1);

        spy.mockImplementation(() => Promise.reject({ data: 'smth', message: 'custom error' }));
        file = mockFile('img2.png', 10 * 1024, 'image/png');
        fireEvent.change(input, { target: { files: [file] } });

        await waitFor(() => expect(queryAllByRole('fileitem').length).toEqual(2));
        expect(err).toEqual({ data: 'smth', val: 'custom error' });
        expect(queryAllByRole('imagelazyloader').length).toBe(0);
        expect(queryAllByRole('thumbnail').length).toBe(2);

        spyConsoleWarn.mockRestore();
        spyConsoleErr.mockRestore();
        spy.mockRestore();
    });

    test('should render default video preview', async () => {
        // const mock =  mockCreateObjectURL('data:video/mp4;base64,');

        // https://stackoverflow.com/questions/59312671/mock-only-one-function-from-module-but-leave-rest-with-original-functionality
        const spy = jest.spyOn(utils, 'generateVideoThumbnail');
        spy.mockImplementation(() => Promise.resolve({ image: 'video-image-src', duration: 10 }));

        const { getByRole, queryAllByRole, findByText } = render(<Manager />);

        await findByText('dragNdrop');

        const input = getByRole('fileinput', { hidden: true }) as HTMLInputElement;
        const file = mockFile('video.mp4', 10 * 1024, 'video/mp4');
        fireEvent.change(input, { target: { files: [file] } });

        await waitFor(() => expect(queryAllByRole('fileitem').length).toEqual(1));
        expect(getByRole('imagelazyloader')).toBeInTheDocument();
        expect(
            within(getByRole('imagelazyloader')).getByRole('img', { hidden: true })
        ).toHaveAttribute('src', 'video-image-src');

        spy.mockRestore();
    });

    test('should render a fallback if an error occurs during video preview creation', async () => {
        const spy = jest.spyOn(utils, 'generateVideoThumbnail');
        spy.mockImplementation(() => Promise.reject({ data: 'smth', message: 'custom error' }));

        let err = null;
        const spyConsoleErr = jest.spyOn(console, 'error').mockImplementation((val, data) => {
            err = { val, data };
        });

        const { getByRole, queryAllByRole, findByText } = render(<Manager />);

        await findByText('dragNdrop');

        const input = getByRole('fileinput', { hidden: true }) as HTMLInputElement;
        const file = mockFile('video.mp4', 10 * 1024, 'video/mp4');
        fireEvent.change(input, { target: { files: [file] } });

        await waitFor(() => expect(queryAllByRole('fileitem').length).toEqual(1));
        expect(err).toEqual({ data: 'smth', val: 'custom error' });
        expect(queryAllByRole('imagelazyloader').length).toBe(0);
        expect(queryAllByRole('thumbnail').length).toBe(1);

        spyConsoleErr.mockRestore();
        spy.mockRestore();
    });

    test('should render default audio preview', async () => {
        global.URL.createObjectURL = jest.fn(() => 'data:audio/wav;base64,');

        const mockedAudio = mockAudio();
        mockedAudio.init = (obj) => {
            obj.duration = 12;
        };

        const { getByRole, getByTestId, queryAllByRole, findByText } = render(<Manager />);

        await findByText('dragNdrop');

        const input = getByRole('fileinput', { hidden: true }) as HTMLInputElement;
        const file = mockFile('snd.mp3', 10 * 1024, 'audio/mpeg');
        fireEvent.change(input, { target: { files: [file] } });

        await waitFor(() => expect(queryAllByRole('fileitem').length).toEqual(1));
        expect(getByTestId('loading-icon')).toBeInTheDocument();

        act(() => {
            mockedAudio.instances[0].onloadedmetadata();
        });

        expect(getByRole('audio')).toBeInTheDocument();

        mockedAudio.mockRestore();
        (global.URL.createObjectURL as jest.Mock).mockReset();
    });

    test('should render a fallback if an error occurs during audio preview creation', async () => {
        global.URL.createObjectURL = jest.fn(() => 'data:audio/wav;base64,');

        const mockedAudio = mockAudio();
        mockedAudio.init = (obj) => {
            obj.duration = 12;
        };

        let err = null;
        const spyConsoleErr = jest.spyOn(console, 'error').mockImplementation((val, data) => {
            err = { val, data };
        });

        const { getByRole, getByTestId, queryAllByRole, findByText } = render(<Manager />);

        await findByText('dragNdrop');

        const input = getByRole('fileinput', { hidden: true }) as HTMLInputElement;
        const file = mockFile('snd.mp3', 10 * 1024, 'audio/mpeg');
        fireEvent.change(input, { target: { files: [file] } });

        await waitFor(() => expect(queryAllByRole('fileitem').length).toEqual(1));
        expect(getByTestId('loading-icon')).toBeInTheDocument();

        const customError = Error('custom error');

        act(() => {
            mockedAudio.instances[0].onerror(customError);
        });

        expect(err).toEqual({
            data: customError,
            val: 'An error occured while loading audio file',
        });
        expect(queryAllByRole('imagelazyloader').length).toBe(0);
        expect(queryAllByRole('thumbnail').length).toBe(1);

        spyConsoleErr.mockRestore();
        mockedAudio.mockRestore();
        (global.URL.createObjectURL as jest.Mock).mockReset();
    });

    test('should test custom preview function', async () => {
        // should use the default implementation

        const spy = jest.spyOn(utils, 'generateImageThumbnail');
        spy.mockImplementation(() => Promise.resolve('image-src'));

        const { rerender, getByRole, getAllByRole, queryAllByRole, findByText } = render(
            <Manager filePreview={() => Promise.resolve()} />
        );

        await findByText('dragNdrop');

        const input = getByRole('fileinput', { hidden: true }) as HTMLInputElement;
        const file = mockFile('img.png', 10 * 1024, 'image/png');
        fireEvent.change(input, { target: { files: [file] } });

        await waitFor(() => expect(queryAllByRole('fileitem').length).toEqual(1));
        expect(spy).toBeCalledTimes(1);
        expect(queryAllByRole('img')[0]).toHaveAttribute('src', 'image-src');

        // should prevent the default implementation
        rerender(<Manager filePreview={() => Promise.reject()} ignoreFileDuplicates="remote" />);

        fireEvent.change(input, { target: { files: [file] } });

        await waitFor(() => expect(queryAllByRole('fileitem').length).toEqual(2));
        expect(spy).toBeCalledTimes(1);
        expect(queryAllByRole('img').length).toEqual(1);

        // should use custom implementation (string)
        rerender(
            <Manager
                filePreview={() => Promise.resolve('base64ImageData')}
                ignoreFileDuplicates="remote"
            />
        );

        fireEvent.change(input, { target: { files: [file] } });

        await waitFor(() => expect(queryAllByRole('fileitem').length).toEqual(3));
        expect(spy).toBeCalledTimes(1);
        expect(queryAllByRole('img').length).toEqual(2);
        expect(queryAllByRole('img')[1]).toHaveAttribute('src', 'base64ImageData');

        // should use custom implementation (object)
        rerender(
            <Manager
                filePreview={() => Promise.resolve({ src: 'base64ImageData' })}
                ignoreFileDuplicates="remote"
            />
        );

        fireEvent.change(input, { target: { files: [file] } });

        await waitFor(() => expect(queryAllByRole('fileitem').length).toEqual(4));
        expect(spy).toBeCalledTimes(1);
        expect(queryAllByRole('img').length).toEqual(3);
        expect(queryAllByRole('img')[2]).toHaveAttribute('src', 'base64ImageData');
    });
});

describe('FileManager uploading', () => {
    beforeEach(() => {
        mockFetch(true, 200, []);
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.clearAllTimers();
        // jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });

    test('should check getUploadParams', async () => {
        const spy = mockSubmitFormData();

        const { formDataFields, restore } = mockFormData();

        const url = '/api/singleFileUpload';
        const fileFieldName = 'fileToUpload';
        const fields = {
            customField: 'some value',
        };
        const headers = {
            customHeader: 'test',
        };
        const method = 'PUT';
        const timeout = 1000;
        const body = 'test body';

        let incomingFiles = null;

        const { getByRole, findByText, findByTestId, findByTitle, getByTitle } = render(
            <Manager
                getUploadParams={(files) => (
                    (incomingFiles = files),
                    {
                        URL: url,
                        fileFieldName,
                        fields,
                        headers,
                        method,
                        timeout,
                        body,
                    }
                )}
            />
        );

        await findByText('dragNdrop');

        const input = getByRole('fileinput', { hidden: true }) as HTMLInputElement;
        fireEvent.change(input, { target: { files: [mockFile()] } });

        await findByTestId('file-container');

        act(() => {
            getByTitle('upload').click();
        });

        expect(Array.isArray(incomingFiles)).toBe(false);

        await waitFor(() =>
            expect(spy).toHaveBeenCalledWith(url, body, {
                headers,
                method,
                onProgress: expect.any(Function),
                timeout,
            })
        );

        expect(formDataFields).toEqual({
            fileToUpload: expect.any(Blob),
            customField: 'some value',
        });

        restore();
        spy.mockRestore();
    });

    test('should upload a single file and clear the list', async () => {
        const spy = mockSubmitFormData();

        const onFilesUploaded: IFileManagerProps['onFilesUploaded'] = jest.fn();

        const { getByRole, findByText, findByTestId, getAllByRole, getByTitle } = render(
            <Manager viewFile={() => Promise.resolve()} onFilesUploaded={onFilesUploaded} />
        );
        await findByText('dragNdrop');

        const input = getByRole('fileinput', { hidden: true }) as HTMLInputElement;
        fireEvent.change(input, { target: { files: [mockFile()] } });

        await findByTestId('file-container');
        expect(managerRef.current.localFiles.length).toEqual(1);
        expect(managerRef.current.remoteFiles.length).toEqual(0);

        act(() => {
            getAllByRole('button')[0].click();
        });

        expect(getByTitle('cancelUpload')).toBeInTheDocument();
        expect(processResponseSimple).toBeCalledTimes(0);

        await waitForElementToBeRemoved(() => getAllByRole('fileitem'));

        expect(processResponseSimple).toBeCalledTimes(1);
        expect(managerRef.current.localFiles.length).toEqual(0);
        expect(managerRef.current.remoteFiles.length).toEqual(0);

        expect(onFilesUploaded).toHaveBeenCalledWith([expect.any(Object)]);

        spy.mockRestore();
    });

    test('should upload a single file and show it in the list', async () => {
        const spy = mockSubmitFormData();
        mockResponse(1);

        const onFilesUploaded: IFileManagerProps['onFilesUploaded'] = jest.fn();

        const { getByRole, queryAllByRole, findByText, findByTestId, getAllByRole, getByTitle } =
            render(
                <Manager viewFile={() => Promise.resolve()} onFilesUploaded={onFilesUploaded} />
            );

        await findByText('dragNdrop');

        const input = getByRole('fileinput', { hidden: true }) as HTMLInputElement;
        const file = mockFile('test.txt');
        fireEvent.change(input, { target: { files: [file] } });

        await findByTestId('file-container');
        expect(managerRef.current.localFiles.length).toEqual(1);
        expect(managerRef.current.remoteFiles.length).toEqual(0);

        act(() => {
            getAllByRole('button')[0].click();
        });

        expect(getByTitle('cancelUpload')).toBeInTheDocument();
        expect(processResponseSimple).toBeCalledTimes(0);

        await waitFor(() => expect(queryAllByRole('menu', { hidden: true }).length).toEqual(1));

        expect(processResponseSimple).toBeCalledTimes(1);
        expect(managerRef.current.localFiles.length).toEqual(0);
        expect(managerRef.current.remoteFiles.length).toEqual(1);

        expect(onFilesUploaded).toHaveBeenCalledWith([expect.any(Object)]);

        spy.mockRestore();
    });

    test('should upload multiple files', async () => {
        const spy = mockSubmitFormData();
        mockResponse(2);

        const onFilesUploaded: IFileManagerProps['onFilesUploaded'] = jest.fn();

        const { getByRole, queryAllByRole, findByText, findByTestId } = render(
            <Manager viewFile={jest.fn().mockReturnValue(null)} onFilesUploaded={onFilesUploaded} />
        );

        await findByText('dragNdrop');

        const input = getByRole('fileinput', { hidden: true }) as HTMLInputElement;
        fireEvent.change(input, { target: { files: [mockFile('1.txt'), mockFile('2.txt')] } });

        await findByTestId('file-container');

        expect(managerRef.current.localFiles.length).toEqual(2);
        expect(managerRef.current.remoteFiles.length).toEqual(0);

        act(() => {
            managerRef.current.upload();
        });

        await waitFor(() => expect(queryAllByRole('menu', { hidden: true }).length).toEqual(2));
        expect(processResponseSimple).toBeCalledTimes(2);
        expect(managerRef.current.localFiles.length).toEqual(0);
        expect(managerRef.current.remoteFiles.length).toEqual(2);

        expect(onFilesUploaded).toHaveBeenNthCalledWith(1, [expect.any(Object)]);
        expect(onFilesUploaded).toHaveBeenNthCalledWith(2, [expect.any(Object)]);

        spy.mockRestore();
    });

    test('should abort file uploading when the user click on the cancel upload button', async () => {
        const abort = jest.fn();

        const retObj = { status: 0, message: 'The file upload was aborted', type: 'abort' };
        const promise = new Promise((_, rej) => setTimeout(() => rej(retObj)));
        promise.catch(() => {}); // https://github.com/facebook/jest/issues/6028#issuecomment-567851031

        const spy = mockSubmitFormData(
            promise as Promise<string>,
            { abort } as unknown as XMLHttpRequest
        );

        const {
            getByRole,
            getByTestId,
            queryAllByRole,
            findByText,
            findByTestId,
            getAllByRole,
            getByTitle,
            queryByTitle,
            findByTitle,
        } = render(<Manager viewFile={() => Promise.resolve()} />);

        await findByText('dragNdrop');

        const input = getByRole('fileinput', { hidden: true }) as HTMLInputElement;
        fireEvent.change(input, { target: { files: [mockFile()] } });

        await findByTestId('file-container');

        act(() => {
            getAllByRole('button')[0].click();
        });

        act(() => {
            getByTitle('cancelUpload').click();
        });

        await waitForElementToBeRemoved(() => queryByTitle('cancelUpload'));
        expect(getByRole('fileitem')).toHaveClass('display-item-upload-error');

        expect(abort).toBeCalledTimes(1);
        expect(errorId).toEqual('upload_aborted');
        // expect(promise).rejects.toEqual(retObj);

        spy.mockRestore();
    });

    test('should abort uploading of multiple files', async () => {
        const abort = jest.fn();

        const retObj = { status: 0, message: 'The file upload was aborted', type: 'abort' };
        const promise = new Promise((_, rej) => setTimeout(() => rej(retObj)));
        promise.catch(() => {});

        const spy = mockSubmitFormData(
            promise as Promise<string>,
            { abort } as unknown as XMLHttpRequest
        );

        const {
            getByRole,
            getByTestId,
            queryAllByRole,
            findByText,
            findByTestId,
            getAllByRole,
            getByTitle,
            queryByTitle,
            findByTitle,
            findAllByTitle,
            unmount,
        } = render(<Manager />);

        await findByText('dragNdrop');

        const input = getByRole('fileinput', { hidden: true }) as HTMLInputElement;
        fireEvent.change(input, { target: { files: [mockFile('1.txt'), mockFile('2.txt')] } });

        await findByTestId('file-container');

        act(() => {
            managerRef.current.upload();
        });

        act(() => {
            managerRef.current.cancelUpload();
        });

        await waitFor(() => expect(queryByTitle('cancelUpload')).not.toBeInTheDocument());

        expect(abort).toBeCalledTimes(2);
        expect(errorId).toEqual(new Array(2).fill('upload_aborted'));

        spy.mockRestore();
    });

    test('should abort file uploading when component was unmounted', async () => {
        const abort = jest.fn();

        const retObj = { status: 0, message: 'The file upload was aborted', type: 'abort' };
        const promise = new Promise((_, rej) => setTimeout(() => rej(retObj)));
        promise.catch(() => {});

        const spy = mockSubmitFormData(
            promise as Promise<string>,
            { abort } as unknown as XMLHttpRequest
        );

        const onUnmountComponent = jest.fn();

        const { getByRole, queryAllByRole, findByText, findByTestId, unmount } = render(
            <Manager onUnmountComponent={onUnmountComponent} />
        );

        await findByText('dragNdrop');

        const input = getByRole('fileinput', { hidden: true }) as HTMLInputElement;
        fireEvent.change(input, { target: { files: [mockFile()] } });

        await findByTestId('file-container');

        act(() => {
            queryAllByRole('button')[0].click();
        });

        unmount();

        expect(abort).toBeCalledTimes(1);
        expect(onUnmountComponent).toBeCalledTimes(1);

        spy.mockRestore();
    });

    test('should skip uploading if component is in read-only state or disabled', async () => {
        const { rerender, findByText, getByRole, findByTestId } = render(<Manager />);

        await findByText('dragNdrop');

        const input = getByRole('fileinput', { hidden: true }) as HTMLInputElement;
        fireEvent.change(input, { target: { files: [mockFile('1.txt')] } });

        await findByTestId('file-container');

        rerender(<Manager readOnly />);

        expect.assertions(2);

        act(() => {
            managerRef.current
                .upload()
                .then((result) => {
                    expect(result).toBe(undefined);
                })
                .catch((err) => {
                    console.error(err);
                    expect(1).toBe(1);
                });
        });

        rerender(<Manager disabled />);

        act(() => {
            managerRef.current
                .upload()
                .then((result) => {
                    expect(result).toBe(undefined);
                })
                .catch((err) => {
                    console.error(err);
                    expect(1).toBe(1);
                });
        });
    });

    test('should skip uploading if there are no files', async () => {
        const { findByText } = render(<Manager />);

        await findByText('dragNdrop');

        expect.assertions(1);

        act(() => {
            managerRef.current
                .upload()
                .then((result) => {
                    expect(result).toBe(undefined);
                })
                .catch((err) => {
                    console.error(err);
                    expect(1).toBe(1);
                });
        });
    });

    test('should skip uploading if files are already uploading', async () => {
        const spy = mockSubmitFormData();
        mockResponse(1);

        const { getByRole, queryAllByRole, findByText, findByTestId, findByRole } = render(
            <Manager viewFile={() => null} />
        );

        await findByText('dragNdrop');

        const input = getByRole('fileinput', { hidden: true }) as HTMLInputElement;
        fireEvent.change(input, { target: { files: [mockFile('1.txt')] } });

        await findByTestId('file-container');

        expect.assertions(3);

        act(() => {
            managerRef.current
                .upload()
                .then((result) => {
                    expect(result).toEqual([{ status: 'fulfilled', value: expect.any(Object) }]);
                })
                .catch((err) => {
                    console.error(err);
                    expect(1).toBe(1);
                });
        });

        expect(queryAllByRole('progressbar').length).toBe(1);

        act(() => {
            managerRef.current
                .upload()
                .then((result) => {
                    expect(result).toBe(undefined);
                })
                .catch((err) => {
                    console.error(err);
                    expect(1).toBe(1);
                });
        });

        await findByRole('menu', { hidden: true });

        spy.mockRestore();
    });

    test('should skip uploading of file that is already uploading', async () => {
        const spy = mockSubmitFormData();

        const { getByRole, queryAllByRole, findByText, findByTestId, getAllByRole } = render(
            <Manager viewFile={() => null} />
        );

        await findByText('dragNdrop');

        const input = getByRole('fileinput', { hidden: true }) as HTMLInputElement;
        fireEvent.change(input, { target: { files: [mockFile('1.txt')] } });

        await findByTestId('file-container');

        const button = getAllByRole('button')[0];

        act(() => {
            button.click();
            button.click();
        });

        await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));

        // expect.assertions(7);
        // fireEvent.change(input, {target: {files: [mockFile('2.txt')]}});
        //
        // await waitFor(() => expect(queryAllByRole('fileitem').length).toBe(2));
        //
        //
        // act(() => {
        //     managerRef.current.upload()
        //     .then(result => {
        //         expect(result).toEqual([
        //             { status: 'fulfilled', value: expect.objectContaining({ fileName: '2.txt' }) }
        //         ]);
        //     })
        //     .catch((err) => {
        //         console.error(err);
        //         expect(1).toBe(1);
        //     })
        //
        //
        //     managerRef.current.upload()
        //     .then(result => {
        //         expect(result).toBe(undefined);
        //     })
        //     .catch((err) => {
        //         console.error(err);
        //         expect(1).toBe(1);
        //     })
        // });
        //
        // await waitForElementToBeRemoved(() => getByRole('progressbar'));
        // expect(spy).toHaveBeenCalledTimes(2);

        spy.mockRestore();
    });

    test('simulates reuploading rejected file during the main uploading process', async () => {
        const { setCustomTimer, advanceTimersByTime, advanceTimersToNextTimer } = useCustomTimer();

        const abort = jest.fn();
        const retObj = { status: 0, message: 'The file upload was aborted', type: 'abort' };

        const spy = jest.spyOn(utils, 'submitFormData');
        spy.mockImplementationOnce(() => ({
            promise: new Promise((_, rej) => setCustomTimer(() => rej(retObj), 5)),
            xhr: { abort } as unknown as XMLHttpRequest,
        }))
            .mockImplementationOnce(() => ({
                promise: new Promise((_, rej) => setCustomTimer(() => rej(retObj), 5)),
                xhr: { abort } as unknown as XMLHttpRequest,
            }))
            .mockImplementationOnce(() => ({
                promise: new Promise((_, rej) => setCustomTimer(() => rej(retObj), 5)),
                xhr: { abort } as unknown as XMLHttpRequest,
            }))
            .mockImplementationOnce(() => ({
                promise: new Promise((res) =>
                    setCustomTimer(() => res({ fileName: 'd4.txt', fileSize: 1024 }), 5)
                ),
                xhr: null,
            }))
            .mockImplementationOnce(() => ({
                promise: new Promise((res) =>
                    setCustomTimer(() => res({ fileName: 'e5.txt', fileSize: 1024 }), 10)
                ),
                xhr: null,
            }))
            .mockImplementationOnce(() => ({
                promise: new Promise((res) =>
                    setCustomTimer(() => res({ fileName: 'a1.txt', fileSize: 1024 }), 5)
                ),
                xhr: null,
            }))
            .mockImplementationOnce(() => ({
                promise: new Promise((res) =>
                    setCustomTimer(() => res({ fileName: 'b2.txt', fileSize: 1024 }), 15)
                ),
                xhr: null,
            }));

        const {
            getByRole,
            queryAllByRole,
            findByText,
            findByTestId,
            findAllByRole,
            getAllByRole,
            queryAllByTitle,
        } = render(<Manager viewFile={() => null} />);

        await findByText('dragNdrop');

        const input = getByRole('fileinput', { hidden: true }) as HTMLInputElement;
        fireEvent.change(input, {
            target: {
                files: [
                    mockFile('1.txt'),
                    mockFile('2.txt'),
                    mockFile('3.txt'),
                    mockFile('4.txt'),
                    mockFile('5.txt'),
                ],
            },
        });

        await findByTestId('file-container');

        expect.assertions(33);

        act(() => {
            managerRef.current
                .upload()
                .then((result) => {
                    // console.log(result)
                    expect(result).toEqual([
                        {
                            status: 'fulfilled',
                            value: expect.objectContaining({ fileName: 'd4.txt' }),
                        },
                        {
                            status: 'fulfilled',
                            value: expect.objectContaining({ fileName: 'e5.txt' }),
                        },
                        {
                            status: 'fulfilled',
                            value: expect.objectContaining({ fileName: 'a1.txt' }),
                        },
                        {
                            status: 'fulfilled',
                            value: expect.objectContaining({ fileName: 'b2.txt' }),
                        },
                        {
                            status: 'rejected',
                            reason: expect.objectContaining({
                                errorId: 'upload_aborted',
                                data: expect.objectContaining({ fileName: '3.txt' }),
                            }),
                        },
                    ]);
                })
                .catch((err) => {
                    console.error(err);
                    expect(1).toBe(1);
                });
        });

        await findAllByRole('progressbar');

        // advanceTimersByTime(5);
        advanceTimersToNextTimer();

        await waitFor(() => expect(queryAllByRole('menu', { hidden: true }).length).toBe(1));

        expect(getAllByRole('fileitem')[0]).toHaveClass('display-item-uploaded');
        expect(getAllByRole('fileitem')[1]).toHaveClass('display-item-upload-error');
        expect(getAllByRole('fileitem')[2]).toHaveClass('display-item-upload-error');
        expect(getAllByRole('fileitem')[3]).toHaveClass('display-item-upload-error');
        expect(getAllByRole('fileitem')[4]).toHaveClass('display-item-uploading');

        act(() => {
            queryAllByTitle('upload')[0].click();
        });

        act(() => {
            queryAllByTitle('upload')[0].click();
        });

        await waitFor(() => expect(queryAllByRole('menu', { hidden: true }).length).toBe(2));

        expect(getAllByRole('fileitem')[0]).toHaveClass('display-item-uploaded');
        expect(getAllByRole('fileitem')[1]).toHaveClass('display-item-uploaded');
        expect(getAllByRole('fileitem')[2]).toHaveClass('display-item-uploading');
        expect(getAllByRole('fileitem')[3]).toHaveClass('display-item-upload-error');
        expect(getAllByRole('fileitem')[4]).toHaveClass('display-item-uploading');

        // advanceTimersByTime(5);
        advanceTimersToNextTimer();

        // await waitFor(() => expect(getAllByRole('fileitem')[2]).toHaveClass('display-item-uploaded'));
        await waitFor(() => expect(queryAllByRole('menu', { hidden: true }).length).toBe(3));
        expect(getAllByRole('fileitem')[0]).toHaveClass('display-item-uploaded');
        expect(getAllByRole('fileitem')[1]).toHaveClass('display-item-uploaded');
        expect(getAllByRole('fileitem')[2]).toHaveClass('display-item-uploaded');
        expect(getAllByRole('fileitem')[3]).toHaveClass('display-item-uploading');
        expect(getAllByRole('fileitem')[4]).toHaveClass('display-item-upload-error');

        // advanceTimersByTime(5);
        advanceTimersToNextTimer();

        await waitFor(() => expect(queryAllByRole('menu', { hidden: true }).length).toBe(4));
        expect(getAllByRole('fileitem')[0]).toHaveClass('display-item-uploaded');
        expect(getAllByRole('fileitem')[1]).toHaveClass('display-item-uploaded');
        expect(getAllByRole('fileitem')[2]).toHaveClass('display-item-uploaded');
        expect(getAllByRole('fileitem')[3]).toHaveClass('display-item-uploaded');
        expect(getAllByRole('fileitem')[4]).toHaveClass('display-item-upload-error');

        // screen.debug();

        spy.mockRestore();
    });

    test('should test uploading progress', async () => {
        let progress: Function = null;

        const spy = jest.spyOn(utils, 'submitFormData');
        spy.mockImplementation((url, formData, opts) => {
            progress = opts.onProgress;
            return {
                promise: new Promise((res) =>
                    setTimeout(() => res({ fileName: 'a1.txt', fileSize: 1024 }))
                ),
                xhr: { abort: () => {} } as unknown as XMLHttpRequest,
            };
        });

        const onUploadProgress: IFileManagerProps['onUploadProgress'] = jest.fn();

        const { getByRole, queryAllByRole, findByText, findByTestId, getAllByRole } = render(
            <Manager viewFile={() => Promise.resolve()} onUploadProgress={onUploadProgress} />
        );

        await findByText('dragNdrop');

        const input = getByRole('fileinput', { hidden: true }) as HTMLInputElement;
        fireEvent.change(input, { target: { files: [mockFile()] } });

        await findByTestId('file-container');

        act(() => {
            getAllByRole('button')[0].click();
        });

        act(() => {
            progress({ total: 1024, loaded: 512 });
            jest.advanceTimersByTime(100);
        });

        expect(getByRole('progressbar').style.width).toMatch('50%');
        expect(onUploadProgress).toHaveBeenCalledWith(50, 512, 1024);

        await waitFor(() => expect(queryAllByRole('menu', { hidden: true }).length).toEqual(1));

        spy.mockRestore();
    });

    test('should test uploading progress with multiple files', async () => {
        const progress: Function[] = [];

        const spy = jest.spyOn(utils, 'submitFormData');
        spy.mockImplementation((url, formData, opts) => {
            progress.push(opts.onProgress);
            return {
                promise: new Promise((res) => setTimeout(() => res(null))),
                xhr: { abort: () => {} } as unknown as XMLHttpRequest,
            };
        });
        mockResponse(2);

        const onUploadProgress: IFileManagerProps['onUploadProgress'] = jest.fn();

        const {
            getByRole,
            getByTestId,
            queryAllByRole,
            findByText,
            findByTestId,
            getAllByRole,
            findByTitle,
        } = render(
            <Manager viewFile={() => Promise.resolve()} onUploadProgress={onUploadProgress} />
        );

        await findByText('dragNdrop');

        const input = getByRole('fileinput', { hidden: true }) as HTMLInputElement;
        fireEvent.change(input, { target: { files: [mockFile('1.txt'), mockFile('2.txt')] } });

        await findByTestId('file-container');

        const promiseAll = jest.spyOn(Promise, 'all');
        promiseAll.mockReturnValue(
            new Promise((res) =>
                setTimeout(() =>
                    res([
                        { status: 'fulfilled', value: null },
                        { status: 'fulfilled', value: null },
                    ])
                )
            )
        );

        act(() => {
            managerRef.current.upload();
        });
        // act(() => {
        //    getAllByRole('button')[0].click();
        // });
        //
        // act(() => {
        //    getAllByRole('button')[1].click();
        // });

        act(() => {
            progress[0]({ total: 1024, loaded: 512 });
            jest.advanceTimersByTime(100);
        });

        act(() => {
            progress[1]({ total: 1024, loaded: 256 });
            jest.advanceTimersByTime(100);
        });

        expect(queryAllByRole('progressbar').length).toEqual(2);

        expect(queryAllByRole('progressbar')[0].style.width).toMatch('50%');
        expect(queryAllByRole('progressbar')[1].style.width).toMatch('25%');

        expect(onUploadProgress).toHaveBeenNthCalledWith(1, 25, 512, 2048);
        expect(onUploadProgress).toHaveBeenNthCalledWith(2, 37.5, 768, 2048);

        await waitFor(() => expect(queryAllByRole('menu', { hidden: true }).length).toEqual(2));

        act(() => {
            jest.advanceTimersByTime(100);
        });

        expect(onUploadProgress).toHaveBeenLastCalledWith(null, 0, 0);

        promiseAll.mockRestore();
        spy.mockRestore();
    });

    test('should restart upload progress listener when during uploading a new file starts to uploading', async () => {
        const spy = mockSubmitFormData();

        const spyClearInterval = jest.spyOn(window, 'clearInterval');

        const { getByRole, queryAllByRole, findByText, findByTestId } = render(<Manager />);

        await findByText('dragNdrop');

        const input = getByRole('fileinput', { hidden: true }) as HTMLInputElement;
        fireEvent.change(input, { target: { files: [mockFile('1.txt'), mockFile('2.txt')] } });

        await findByTestId('file-container');

        expect(spyClearInterval).not.toHaveBeenCalled();

        act(() => {
            queryAllByRole('button')[0].click();
        });

        jest.advanceTimersByTime(100);

        act(() => {
            queryAllByRole('button')[1].click();
        });

        await waitFor(() => expect(queryAllByRole('progressbar').length).toBe(2));

        expect(spyClearInterval).toBeCalledTimes(1);

        spyClearInterval.mockRestore();
        spy.mockRestore();
    });

    test('should stop upload progress listener when component is unmounted', async () => {
        const promise = new Promise((_, rej) => setTimeout(() => rej({})));
        promise.catch(() => {});

        const spy = mockSubmitFormData(
            promise as Promise<string>,
            { abort: jest.fn() } as unknown as XMLHttpRequest
        );

        const spyClearInterval = jest.spyOn(window, 'clearInterval');

        const { getByRole, queryAllByRole, findByText, findByTestId, unmount } = render(
            <Manager />
        );

        await findByText('dragNdrop');

        const input = getByRole('fileinput', { hidden: true }) as HTMLInputElement;
        fireEvent.change(input, { target: { files: [mockFile()] } });

        await findByTestId('file-container');

        act(() => {
            queryAllByRole('button')[0].click();
        });

        jest.advanceTimersByTime(100);

        unmount();

        jest.advanceTimersByTime(100);

        expect(spyClearInterval).toBeCalledTimes(1);

        spyClearInterval.mockRestore();
        spy.mockRestore();
    });

    test('should throw an error when checkResult function returns false', async () => {
        const spy = mockSubmitFormData();

        const { getByRole, findByText, findByTestId } = render(
            <Manager
                getUploadParams={() => ({
                    URL: `/api/singleFileUpload`,
                    processResponse: processResponseSimple,
                    processError: getErrorMessage,
                    checkResult: () => false,
                })}
            />
        );

        await findByText('dragNdrop');

        const input = getByRole('fileinput', { hidden: true }) as HTMLInputElement;
        fireEvent.change(input, { target: { files: [mockFile()] } });

        await findByTestId('file-container');

        expect.assertions(2);

        act(() => {
            managerRef.current
                .upload()
                .then((result) => {
                    expect(result).toEqual([
                        {
                            status: 'rejected',
                            reason: {
                                errorId: 'upload_wrong_result',
                                message: expect.any(String),
                                data: expect.any(Object),
                            },
                        },
                    ]);
                })
                .catch((err) => {
                    console.error(err);
                    expect(1).toBe(1);
                });
        });

        await waitForElementToBeRemoved(() => getByRole('progressbar'));

        expect(getByRole('fileitem')).toHaveClass('display-item-upload-error');

        // screen.debug();

        spy.mockRestore();
    });

    test('should upload file automatically', async () => {
        mockFetch(true, 200, []);

        const spy = mockSubmitFormData();
        mockResponse(1);

        const { getByRole, queryAllByRole, findByText } = render(
            <Manager viewFile={() => Promise.resolve()} autoUpload />
        );

        await findByText('dragNdrop');

        const input = getByRole('fileinput', { hidden: true }) as HTMLInputElement;
        fireEvent.change(input, { target: { files: [mockFile()] } });

        await waitFor(() => expect(queryAllByRole('menu', { hidden: true }).length).toEqual(1));

        spy.mockRestore();
    });

    test('should test onLoading property', async () => {
        mockFetch(true, 200, simpleResponse);

        const spy = mockSubmitFormData();
        const onLoading: IFileManagerProps['onLoading'] = jest.fn();

        const { getByRole, findByTestId, findByTitle, queryByRole } = render(
            <Manager viewFile={() => Promise.resolve()} onLoading={onLoading} />
        );

        expect(onLoading).nthCalledWith(1, false, false);
        expect(onLoading).nthCalledWith(2, true, false);

        await findByTestId('file-container');

        expect(onLoading).nthCalledWith(3, false, false);

        const input = getByRole('fileinput', { hidden: true }) as HTMLInputElement;
        fireEvent.change(input, { target: { files: [mockFile()] } });

        const uploadButton = await findByTitle('upload');

        act(() => {
            uploadButton.click();
        });

        expect(onLoading).nthCalledWith(4, false, true);

        await waitFor(() => expect(queryByRole('progressbar')).not.toBeInTheDocument());

        act(() => {
            jest.advanceTimersByTime(100);
        });

        expect(onLoading).nthCalledWith(5, false, false);

        spy.mockRestore();
    });
});

describe('FileManager uploading (one request upload mode)', () => {
    beforeEach(() => {
        mockFetch(true, 200, []);
    });

    afterEach(() => {
        jest.clearAllTimers();
    });

    test('should check getUploadParams', async () => {
        const spy = mockSubmitFormData();

        const { formDataFields, restore } = mockFormData();

        const url = '/api/multipleFileUpload';
        const fileFieldName = 'fileToUpload';
        const fields = {
            customField: 'some value',
        };
        const headers = {
            customHeader: 'test',
        };
        const method = 'PUT';
        const timeout = 1000;
        const body = 'test body';

        let incomingFiles = null;

        const { getByRole, findByText, findByTestId } = render(
            <Manager
                uploadFilesInOneRequest
                getUploadParams={(files) => (
                    (incomingFiles = files),
                    {
                        URL: url,
                        fileFieldName,
                        fields,
                        headers,
                        method,
                        timeout,
                        body,
                    }
                )}
            />
        );

        await findByText('dragNdrop');

        const input = getByRole('fileinput', { hidden: true }) as HTMLInputElement;
        fireEvent.change(input, { target: { files: [mockFile()] } });

        await findByTestId('file-container');

        act(() => {
            managerRef.current.upload();
        });

        expect(Array.isArray(incomingFiles)).toBe(true);

        await waitFor(() =>
            expect(spy).toHaveBeenCalledWith(url, body, {
                headers,
                method,
                onProgress: expect.any(Function),
                timeout,
            })
        );

        expect(formDataFields).toEqual({
            fileToUpload: expect.any(Blob),
            customField: 'some value',
        });

        restore();
        spy.mockRestore();
    });

    test('should upload files and clear the list', async () => {
        const spy = mockSubmitFormData();

        const onFilesUploaded: IFileManagerProps['onFilesUploaded'] = jest.fn();

        const { getByRole, getAllByRole, getByTestId, queryAllByRole, findByText, findByTestId } =
            render(
                <Manager
                    uploadFilesInOneRequest
                    onFilesUploaded={onFilesUploaded}
                    viewFile={() => Promise.resolve()}
                />
            );

        await findByText('dragNdrop');

        const input = getByRole('fileinput', { hidden: true }) as HTMLInputElement;
        fireEvent.change(input, { target: { files: [mockFile('1.txt'), mockFile('2.txt')] } });

        await findByTestId('file-container');
        expect(managerRef.current.localFiles.length).toEqual(2);
        expect(managerRef.current.remoteFiles.length).toEqual(0);

        act(() => {
            managerRef.current.upload();
        });

        expect(queryAllByRole('progressbar').length).toEqual(2);
        expect(queryAllByRole('button').length).toEqual(0);
        expect(processResponseSimple).toBeCalledTimes(0);

        await waitForElementToBeRemoved(() => getAllByRole('fileitem'));

        expect(processResponseSimple).toBeCalledTimes(1);
        expect(onFilesUploaded).toHaveBeenCalledWith([expect.any(Object), expect.any(Object)]);

        spy.mockRestore();
    });

    test('should upload files and show them in the list', async () => {
        const spy = mockSubmitFormData();
        processResponseSimple.mockImplementationOnce(() => simpleResponse);

        const onFilesUploaded: IFileManagerProps['onFilesUploaded'] = jest.fn();

        const { getByRole, queryAllByRole, findByText, findByTestId } = render(
            <Manager
                uploadFilesInOneRequest
                onFilesUploaded={onFilesUploaded}
                viewFile={() => Promise.resolve()}
            />
        );

        await findByText('dragNdrop');

        const input = getByRole('fileinput', { hidden: true }) as HTMLInputElement;
        fireEvent.change(input, { target: { files: [mockFile('1.txt'), mockFile('2.txt')] } });

        await findByTestId('file-container');
        expect(managerRef.current.localFiles.length).toEqual(2);
        expect(managerRef.current.remoteFiles.length).toEqual(0);

        act(() => {
            managerRef.current.upload();
        });

        expect(queryAllByRole('progressbar').length).toEqual(2);
        expect(queryAllByRole('button').length).toEqual(0);
        expect(processResponseSimple).toBeCalledTimes(0);

        await waitFor(() => expect(queryAllByRole('menu', { hidden: true }).length).toEqual(2));

        expect(processResponseSimple).toBeCalledTimes(1);
        expect(managerRef.current.localFiles.length).toEqual(0);
        expect(managerRef.current.remoteFiles.length).toEqual(2);

        expect(onFilesUploaded).toHaveBeenCalledWith([expect.any(Object), expect.any(Object)]);

        spy.mockRestore();
    });

    test('should abort uploading files', async () => {
        const onUploadProgress = jest.fn();
        const abort = jest.fn();

        const retObj = { status: 0, message: 'The file upload was aborted', type: 'abort' };
        const promise = new Promise((_, rej) => setTimeout(() => rej(retObj)));
        promise.catch(() => {});

        const spy = mockSubmitFormData(
            promise as Promise<string>,
            { abort } as unknown as XMLHttpRequest
        );

        const { getByRole, getByTestId, queryAllByRole, findByText, findByTestId } = render(
            <Manager
                uploadFilesInOneRequest
                onUploadProgress={onUploadProgress}
                viewFile={() => Promise.resolve()}
            />
        );

        await findByText('dragNdrop');

        const input = getByRole('fileinput', { hidden: true }) as HTMLInputElement;
        fireEvent.change(input, { target: { files: [mockFile('1.txt'), mockFile('2.txt')] } });

        await findByTestId('file-container');
        expect(managerRef.current.localFiles.length).toEqual(2);
        expect(managerRef.current.remoteFiles.length).toEqual(0);

        act(() => {
            managerRef.current.upload();
        });

        act(() => {
            managerRef.current.cancelUpload();
        });

        await waitFor(() => expect(queryAllByRole('button').length).toEqual(2));
        expect(abort).toBeCalledTimes(1);
        expect(errorId).toEqual('upload_aborted');
        expect(managerRef.current.localFiles.length).toEqual(2);
        expect(managerRef.current.remoteFiles.length).toEqual(0);
        expect(onUploadProgress).toHaveBeenCalledWith(null, 0, 0);

        spy.mockRestore();
    });

    test('should abort file uploading when component was unmounted', async () => {
        const abort = jest.fn();

        const retObj = { status: 0, message: 'The file upload was aborted', type: 'abort' };
        const promise = new Promise((_, rej) => setTimeout(() => rej(retObj)));
        promise.catch(() => {});

        const spy = mockSubmitFormData(
            promise as Promise<string>,
            { abort } as unknown as XMLHttpRequest
        );

        const onUnmountComponent = jest.fn();

        const { getByRole, findByText, findByTestId, unmount } = render(
            <Manager uploadFilesInOneRequest onUnmountComponent={onUnmountComponent} />
        );

        await findByText('dragNdrop');

        const input = getByRole('fileinput', { hidden: true }) as HTMLInputElement;
        fireEvent.change(input, { target: { files: [mockFile()] } });

        await findByTestId('file-container');

        act(() => {
            managerRef.current.upload();
        });

        unmount();

        expect(abort).toBeCalledTimes(1);
        expect(onUnmountComponent).toBeCalledTimes(1);

        spy.mockRestore();
    });

    test('should skip uploading when there are no files or uploading has already started', async () => {
        const spy = mockSubmitFormData();
        mockResponse(1);

        const { getByRole, queryAllByRole, findByText, findByTestId } = render(
            <Manager uploadFilesInOneRequest />
        );

        await findByText('dragNdrop');

        expect.assertions(3);

        act(() => {
            managerRef.current
                .upload()
                .then((result) => {
                    expect(result).toBe(undefined);
                })
                .catch((err) => {
                    console.error(err);
                    expect(1).toBe(1);
                });
        });

        const input = getByRole('fileinput', { hidden: true }) as HTMLInputElement;
        fireEvent.change(input, { target: { files: [mockFile()] } });

        await findByTestId('file-container');

        act(() => {
            managerRef.current
                .upload()
                .then((result) => {
                    expect(result).toEqual({
                        status: 'fulfilled',
                        value: [expect.any(Object)],
                    });
                })
                .catch((err) => {
                    console.error(err);
                    expect(1).toBe(1);
                });
        });

        act(() => {
            managerRef.current
                .upload()
                .then((result) => {
                    expect(result).toBe(undefined);
                })
                .catch((err) => {
                    console.error(err);
                    expect(1).toBe(1);
                });
        });

        await waitFor(() => queryAllByRole('menu', { hidden: true }));

        spy.mockRestore();
    });

    test('should test uploading progress', async () => {
        let progress: Function = null;

        const spy = jest.spyOn(utils, 'submitFormData');
        spy.mockImplementation((url, formData, opts) => {
            progress = opts.onProgress;
            return {
                promise: new Promise((res) => setTimeout(() => res(null))),
                xhr: { abort: () => {} } as unknown as XMLHttpRequest,
            };
        });

        processResponseSimple
            .mockImplementationOnce(() => simpleResponse)
            .mockImplementationOnce(() => simpleResponse);

        const onUploadProgress: IFileManagerProps['onUploadProgress'] = jest.fn();

        const { rerender, getByRole, queryAllByRole, findByText, findByTestId, getAllByRole } =
            render(
                <Manager
                    uploadFilesInOneRequest
                    onUploadProgress={onUploadProgress}
                    viewFile={() => Promise.resolve()}
                />
            );

        await findByText('dragNdrop');

        const input = getByRole('fileinput', { hidden: true }) as HTMLInputElement;
        fireEvent.change(input, { target: { files: [mockFile('1.txt'), mockFile('2.txt')] } });

        await findByTestId('file-container');

        act(() => {
            managerRef.current.upload();
        });

        act(() => {
            progress({ total: 1024, loaded: 512 });
            jest.advanceTimersByTime(100);
        });

        expect(queryAllByRole('progressbar').length).toEqual(0);
        expect(onUploadProgress).toHaveBeenCalledWith(50, 512, 1024);

        await waitFor(() => expect(queryAllByRole('menu', { hidden: true }).length).toEqual(2));

        expect(onUploadProgress).toHaveBeenCalledWith(null, 0, 0);

        // should render file items with progress bar
        rerender(<Manager uploadFilesInOneRequest viewFile={() => Promise.resolve()} />);

        fireEvent.change(input, { target: { files: [mockFile('3.txt'), mockFile('4.txt')] } });

        await waitFor(() => expect(getAllByRole('fileitem').length).toEqual(4));

        act(() => {
            managerRef.current.upload();
        });

        act(() => {
            progress({ total: 1024, loaded: 512 });
            jest.advanceTimersByTime(100);
        });

        expect(queryAllByRole('progressbar').length).toEqual(2);
        expect(onUploadProgress).toHaveBeenCalledWith(50, 512, 1024);

        await waitFor(() => expect(queryAllByRole('menu', { hidden: true }).length).toEqual(4));

        spy.mockRestore();
    });

    test('should throw an error when checkResult function returns false', async () => {
        const spy = mockSubmitFormData();

        const { getByRole, findByText, findByTestId } = render(
            <Manager
                uploadFilesInOneRequest
                getUploadParams={() => ({
                    URL: `/api/singleFileUpload`,
                    processResponse: processResponseSimple,
                    processError: getErrorMessage,
                    checkResult: () => false,
                })}
            />
        );

        await findByText('dragNdrop');

        const input = getByRole('fileinput', { hidden: true }) as HTMLInputElement;
        fireEvent.change(input, { target: { files: [mockFile()] } });

        await findByTestId('file-container');

        expect.assertions(2);

        act(() => {
            managerRef.current
                .upload()
                .then((result) => {
                    expect(result).toEqual({
                        status: 'rejected',
                        reason: {
                            errorId: 'upload_wrong_result',
                            message: expect.any(String),
                            data: [expect.any(Object)],
                        },
                    });
                })
                .catch((err) => {
                    console.error(err);
                    expect(1).toBe(1);
                });
        });

        await waitForElementToBeRemoved(() => getByRole('progressbar'));

        expect(getByRole('fileitem')).toHaveClass('display-item-upload-error');

        spy.mockRestore();
    });

    test('should upload file automatically', async () => {
        mockFetch(true, 200, []);

        const spy = mockSubmitFormData();
        mockResponse(1);

        const { getByRole, queryAllByRole, findByText } = render(
            <Manager uploadFilesInOneRequest viewFile={() => Promise.resolve()} autoUpload />
        );

        await findByText('dragNdrop');

        const input = getByRole('fileinput', { hidden: true }) as HTMLInputElement;
        fireEvent.change(input, { target: { files: [mockFile()] } });

        await waitFor(() => expect(queryAllByRole('menu', { hidden: true }).length).toEqual(1));

        spy.mockRestore();
    });

    test('should test onLoading property', async () => {
        mockFetch(true, 200, simpleResponse);
        mockResponse(1);

        const spy = mockSubmitFormData();
        const onLoading: IFileManagerProps['onLoading'] = jest.fn();

        const { getByRole, queryAllByRole, findByTestId } = render(
            <Manager
                uploadFilesInOneRequest
                viewFile={() => Promise.resolve()}
                onLoading={onLoading}
            />
        );

        expect(onLoading).nthCalledWith(1, false, false);
        expect(onLoading).nthCalledWith(2, true, false);

        await findByTestId('file-container');

        expect(onLoading).nthCalledWith(3, false, false);

        const input = getByRole('fileinput', { hidden: true }) as HTMLInputElement;
        fireEvent.change(input, { target: { files: [mockFile()] } });

        await waitFor(() => expect(queryAllByRole('fileitem').length).toEqual(3));

        act(() => {
            managerRef.current.upload();
        });

        expect(onLoading).nthCalledWith(4, false, true);

        await waitFor(() => expect(queryAllByRole('menu', { hidden: true }).length).toEqual(3));

        act(() => {
            jest.advanceTimersByTime(100);
        });

        expect(onLoading).nthCalledWith(5, false, false);

        spy.mockRestore();
    });
});

describe('FileManager basic tests', () => {
    afterEach(() => {
        jest.clearAllTimers();
    });

    test('should render component with default fetchRemoteFiles function', async () => {
        const { getByTestId, findByText } = render(<Manager fetchRemoteFiles={undefined} />);

        expect(within(getByTestId('label')).queryByText('loading')).not.toBeNull();

        await findByText('dragNdrop');
        expect(within(getByTestId('label')).queryByText('dragNdrop')).not.toBeNull();
    });

    test('should disable file input if getUploadParams is not defined', async () => {
        mockFetch(true, 200, []);

        const { getByRole, findByText } = render(<Manager getUploadParams={undefined} />);

        await findByText('dragNdrop');

        expect(getByRole('fileinput', { hidden: true })).not.toBeEnabled();
    });

    test('should render component with no files', async () => {
        mockFetch(true, 200, []);

        const { getByRole, getByTestId, findByTestId, findByText } = render(<Manager />);

        expect(within(getByTestId('label')).queryByText('loading')).not.toBeNull();

        await findByText('dragNdrop');
        expect(within(getByTestId('label')).queryByText('dragNdrop')).not.toBeNull();
    });

    test('should render component with two files', async () => {
        mockFetch(true, 200, simpleResponse);

        const { getByRole, getByTestId, findByTestId, findByText } = render(<Manager />);

        expect(within(getByTestId('label')).queryByText('loading')).not.toBeNull();

        // waitFor(() => expect(within(getByTestId('label')).queryByText('dragNdrop')).not.toBeNull());
        const fileContainer = await findByTestId('file-container');
        const fileItems = within(fileContainer).getAllByRole('fileitem');
        expect(fileItems.length).toEqual(2);
    });

    test('should render component with no files if the request was rejected', async () => {
        mockFetch(false, 200, []);

        // suppress and trap the error to be printed to the console
        let error: Error = null;
        const spy = jest.spyOn(console, 'error').mockImplementation((e) => {
            error = e;
        });

        const { getByText } = render(<Manager />);
        await waitFor(() => expect(getByText('dragNdrop')).toBeInTheDocument());

        expect(error).toBe('test-error');

        spy.mockRestore();
    });

    test('should display the component normally and throw an error in the console due to the incorrect response of the fetchRemoteFiles function', async () => {
        mockFetch(true, 200, {});

        let error: Error = null;
        const spy = jest.spyOn(console, 'error').mockImplementation((e) => {
            error = e;
        });

        const { getByText } = render(<Manager />);
        await waitFor(() => expect(getByText('dragNdrop')).toBeInTheDocument());

        expect(error.message).toBe(errorTxtUploadedFilesNotArray);

        spy.mockRestore();
    });

    test('should test file field mapping', async () => {
        mockFetch(true, 200, [
            {
                file_id: '18c27',
                file_name: 'readOnly.pdf',
                file_size: 100 * 1024,
                file_type: 'PDF',
                description: 'Readme',
                thumbnail: 'img_src',
                read_only: true,
                disabled: true,
            },
        ]);

        const restoreObserver = setObserverToNull();

        const { getByRole, getByText, findByTestId, getByTestId, getByTitle } = render(
            <Manager
                fileFieldMapping={(fileData) => ({
                    uid: fileData.file_id, // required
                    fileName: fileData.file_name, // required
                    fileSize: fileData.file_size, // required
                    fileType: fileData.file_type, // optional
                    description: fileData.description, // optional
                    previewData: {
                        src: fileData.thumbnail, // optional
                    },
                    readOnly: fileData.read_only, // optional
                    disabled: fileData.disabled, // optional
                })}
                viewFile={() => {
                    return null;
                }}
            />
        );

        const fileContainer = await findByTestId('file-container');
        const fileItems = within(fileContainer).getAllByRole('fileitem');
        expect(fileItems.length).toEqual(1);

        expect(fileItems[0]).toHaveAttribute('id', '18c27');
        expect(getByTitle('readOnly.pdf')).toBeInTheDocument();
        expect(getByText('PDF')).toBeInTheDocument();
        expect(getByText('100 kB')).toBeInTheDocument();
        expect(getByText('Readme')).toBeInTheDocument();
        expect(getByTestId('read-only-label')).toBeInTheDocument();
        expect(getByRole('button')).toHaveAttribute('disabled');
        expect(getByRole('img')).toHaveAttribute('src', 'img_src');

        restoreObserver();
    });

    test('should display the appropriate text depending on whether the file is accepted or rejected when dragged', async () => {
        mockFetch(true, 200, []);

        const { getByRole, getByTestId, findByTestId, findByText, queryByTestId } = render(
            <Manager accept="audio/*" />
        );

        await findByText('dragNdrop');

        const root = getByRole('root');

        // rejection
        let file = mockFile('ping.json', 10 * 1024, 'application/json');
        let event = createEventWithFiles([file]);

        // enter
        fireEvent.dragEnter(root, event);
        expect(within(getByTestId('label')).queryByText('dragNdropReject')).not.toBeNull();

        // over
        fireEvent.dragOver(root, event);
        expect(within(getByTestId('label')).queryByText('dragNdropReject')).not.toBeNull();

        // leave
        fireEvent.dragLeave(root, event);
        expect(within(getByTestId('label')).queryByText('dragNdrop')).not.toBeNull();

        // acceptance
        file = mockFile('snd.wav', 10 * 1024, 'audio/wav');
        event = createEventWithFiles([file]);

        // enter
        fireEvent.dragEnter(root, event);
        expect(within(getByTestId('label')).queryByText('dragNdropAccept')).not.toBeNull();

        // over
        fireEvent.dragOver(root, event);
        expect(within(getByTestId('label')).queryByText('dragNdropAccept')).not.toBeNull();

        // leave
        fireEvent.dragLeave(root, event);
        expect(within(getByTestId('label')).queryByText('dragNdrop')).not.toBeNull();
        // jest.runAllTimers();
    });

    test('should fire FileInput click event when the user click on the root element', async () => {
        mockFetch(true, 200, []);

        const { getByRole, findByText } = render(<Manager />);

        await findByText('dragNdrop');

        const input = getByRole('fileinput', { hidden: true }) as HTMLInputElement;
        const root = getByRole('root');

        input.click = jest.fn();

        fireEvent.click(root);
        expect(input.click).toHaveBeenCalled();
    });

    test('should accept file on drop event', async () => {
        mockFetch(true, 200, []);

        const { getByRole, findByTestId, findByText, queryByText } = render(<Manager />);

        await findByText('dragNdrop');

        const root = getByRole('root');

        const file = mockFile('ping.json', 10 * 1024, 'application/json');
        const event = createEventWithFiles([file]);

        // drop
        fireEvent.dragEnter(root, event);
        expect(queryByText('dragNdropAccept')).not.toBeNull();

        fireEvent.drop(root, event);

        await findByTestId('file-container');

        expect(handleDropFiles).toBeCalledTimes(1);
        expect(acceptedFiles.length).toEqual(1);
        expect(fileRejections.length).toEqual(0);
    });

    test('should ignore events without files', async () => {
        mockFetch(true, 200, []);

        const { getByRole, queryByText, findByText } = render(<Manager />);

        await findByText('dragNdrop');

        const root = getByRole('root');

        const event = new Event('drop', { bubbles: true });

        // drop
        fireEvent.dragEnter(root, event);
        expect(queryByText('dragNdropAccept')).toBeNull();

        fireEvent.dragOver(root, event);
        fireEvent.drop(root, event);

        expect(handleDropFiles).toBeCalledTimes(0);
        expect(acceptedFiles.length).toEqual(0);
        expect(fileRejections.length).toEqual(0);
    });

    // https://stackoverflow.com/questions/41702911/how-can-i-test-a-change-handler-for-a-file-type-input-in-react-using-jest-enzyme
    test('should accept file on the FileInput change event', async () => {
        mockFetch(true, 200, []);

        const { rerender, getByRole, getByTestId, findByTestId, findByText } = render(<Manager />);

        await findByText('dragNdrop');

        const input = getByRole('fileinput', { hidden: true }) as HTMLInputElement;
        const file = mockFile('ping.json', 10 * 1024, 'application/json');
        fireEvent.change(input, { target: { files: [file] } });

        await findByTestId('file-container');

        expect(handleDropFiles).toBeCalledTimes(1);
        expect(acceptedFiles.length).toEqual(1);
        expect(fileRejections.length).toEqual(0);
    });

    test('should test uploaded file item menu', async () => {
        mockFetch(true, 200, [
            {
                uid: '77a21',
                fileName: 'Disabled.txt',
                fileSize: 77123,
                fileType: 'TXT',
                description: 'Disabled',
                readOnly: false,
                disabled: true,
            },
            ...simpleResponse,
        ]);

        const viewFile = jest.fn(() => Promise.resolve());
        const downloadFile = jest.fn(() => Promise.resolve());
        const setFileDescription = jest.fn(() => Promise.resolve('newFileDesc'));
        const deleteFile = jest.fn(() => Promise.resolve());

        const {
            rerender,
            getAllByRole,
            getByTestId,
            findByTestId,
            getByRole,
            findByTitle,
            getByTitle,
            queryAllByRole,
            unmount,
        } = render(
            <Manager
                viewFile={viewFile}
                downloadFile={downloadFile}
                setFileDescription={setFileDescription}
                deleteFile={deleteFile}
            />
        );

        await findByTestId('file-container');

        expect(getAllByRole('button')[0]).toHaveAttribute('disabled');
        expect(
            within(getAllByRole('menu', { hidden: true })[0]).queryAllByRole('menuitem', {
                hidden: true,
            }).length
        ).toEqual(4);
        expect(
            within(getAllByRole('menu', { hidden: true })[1]).queryAllByRole('menuitem', {
                hidden: true,
            }).length
        ).toEqual(2);

        const clickOnFileItem = (index: number) => {
            act(() => {
                getAllByRole('button')[1].click();
            });
            getAllByRole('menuitem')[index].click();
        };

        // Custom implementation

        // view
        clickOnFileItem(0);
        expect(viewFile).toBeCalledTimes(1);

        // download
        clickOnFileItem(1);
        expect(downloadFile).toBeCalledTimes(1);

        // rename
        clickOnFileItem(2);
        (await findByTitle('Confirm')).click();
        await waitFor(() =>
            expect(within(getAllByRole('fileitem')[1]).queryAllByRole('button').length).toEqual(1)
        );
        expect(getByTitle('sound.mp3').innerHTML).toEqual('newFileDesc');

        expect(setFileDescription).toBeCalledTimes(1);

        // delete
        clickOnFileItem(3);
        await waitFor(() => expect(getAllByRole('fileitem').length).toEqual(2));
        expect(deleteFile).toBeCalledTimes(1);

        // Rejection

        const onViewFileReject = jest.fn(() => Promise.reject());
        const onDownloadFileReject = jest.fn(() => Promise.reject());
        const onRenameFileDescriptionReject = jest.fn(() => Promise.reject());
        const onDeleteFileReject = jest.fn(() => Promise.reject('error message'));

        jest.runAllTimers();
        unmount();

        rerender(
            <Manager
                viewFile={onViewFileReject}
                downloadFile={onDownloadFileReject}
                setFileDescription={onRenameFileDescriptionReject}
                deleteFile={onDeleteFileReject}
            />
        );
        await waitFor(() => expect(getAllByRole('fileitem').length).toEqual(3));

        // view
        clickOnFileItem(0);
        await waitFor(() => expect(queryAllByRole('menu').length).toEqual(0));
        expect(onViewFileReject).toBeCalledTimes(1);
        expect(handleErrors).toBeCalledTimes(1);
        expect(errorId).toEqual('view_error');

        // download
        clickOnFileItem(1);
        await waitFor(() => expect(queryAllByRole('menu').length).toEqual(0));
        expect(onDownloadFileReject).toBeCalledTimes(1);
        expect(handleErrors).toBeCalledTimes(2);
        expect(errorId).toEqual('download_error');

        // rename
        clickOnFileItem(2);
        (await findByTitle('Confirm')).click();
        await waitFor(() =>
            expect(within(getAllByRole('fileitem')[1]).queryAllByRole('button').length).toEqual(1)
        );
        expect(getByTitle('sound.mp3').innerHTML).toEqual('Melody');
        expect(onRenameFileDescriptionReject).toBeCalledTimes(1);
        expect(handleErrors).toBeCalledTimes(3);
        expect(errorId).toEqual('rename_error');

        // delete
        clickOnFileItem(3);
        await waitFor(() => expect(queryAllByRole('menu').length).toEqual(0));
        expect(onDeleteFileReject).toBeCalledTimes(1);
        expect(handleErrors).toBeCalledTimes(4);
        expect(errorId).toEqual('delete_error');

        // Test silent deletion

        const onDeleteFileRejectSilent = jest.fn(() => Promise.reject());

        rerender(<Manager deleteFile={onDeleteFileRejectSilent} />);
        await waitFor(() => expect(getAllByRole('fileitem').length).toEqual(3));

        clickOnFileItem(0);
        await waitFor(() => expect(queryAllByRole('menu').length).toEqual(0));
        expect(onDeleteFileRejectSilent).toBeCalledTimes(1);
        expect(handleErrors).toBeCalledTimes(4);
        expect(errorId).toEqual('delete_error');

        // Internal implementation

        const onViewFileII = jest.fn(() => Promise.resolve(new Blob([])));
        const onDownloadFileII = jest.fn(() => Promise.resolve(new Blob([])));

        rerender(<Manager viewFile={onViewFileII} downloadFile={onDownloadFileII} />);
        await waitFor(() => expect(getAllByRole('fileitem').length).toEqual(3));

        // view
        let spy = jest.spyOn(utils, 'openBlob').mockImplementation(() => {});

        clickOnFileItem(0);
        await waitFor(() => expect(queryAllByRole('menu').length).toEqual(0));
        expect(onViewFileII).toBeCalledTimes(1);
        expect(spy).toBeCalledTimes(1);

        spy.mockRestore();

        // download
        let fileName: string = null;
        spy = jest.spyOn(utils, 'saveBlob').mockImplementation((blob, name) => {
            fileName = name;
        });

        clickOnFileItem(1);
        await waitFor(() => expect(queryAllByRole('menu').length).toEqual(0));
        expect(onDownloadFileII).toBeCalledTimes(1);
        expect(spy).toBeCalledTimes(1);
        expect(fileName).toEqual('Melody');

        // test internal download implementation with custom filename

        const onDownloadFileII2 = jest.fn(() =>
            Promise.resolve({ blob: new Blob([]), fileName: 'customFileName' })
        );

        rerender(<Manager downloadFile={onDownloadFileII2} />);
        await waitFor(() => expect(getAllByRole('fileitem').length).toEqual(3));

        clickOnFileItem(0);
        await waitFor(() => expect(queryAllByRole('menu').length).toEqual(0));
        expect(onDownloadFileII2).toBeCalledTimes(1);
        expect(spy).toBeCalledTimes(2);
        expect(fileName).toEqual('customFileName');

        spy.mockRestore();
    });

    test('should set component to read only mode', async () => {
        mockFetch(true, 200, simpleResponse);

        const { rerender, getAllByRole, getByRole, findByTestId, queryAllByRole, queryByTestId } =
            render(
                <Manager
                    viewFile={() => Promise.resolve()}
                    downloadFile={() => Promise.resolve()}
                    setFileDescription={() => Promise.resolve('')}
                    deleteFile={() => Promise.resolve()}
                    readOnly
                    addFileDescription
                />
            );

        await findByTestId('file-container');
        // act(() => { getAllByRole('button')[0].click(); });
        expect(
            within(getAllByRole('menu', { hidden: true })[0]).queryAllByRole('menuitem', {
                hidden: true,
            }).length
        ).toEqual(2);
        expect(
            within(getAllByRole('menu', { hidden: true })[0]).getByText('View')
        ).toBeInTheDocument();
        expect(
            within(getAllByRole('menu', { hidden: true })[0]).getByText('Download')
        ).toBeInTheDocument();

        const input = getByRole('fileinput', { hidden: true }) as HTMLInputElement;
        const root = getByRole('root');

        input.click = jest.fn();

        fireEvent.click(root);
        expect(input.click).not.toHaveBeenCalled();
        (input.click as jest.Mock).mockRestore();

        const event = createEventWithFiles([mockFile()]);

        fireEvent.dragEnter(root, event);
        expect(queryByTestId('label')).toBeNull();

        fireEvent.drop(root, event);
        expect(handleDropFiles).not.toHaveBeenCalled();

        fireEvent.change(input, { target: { files: [mockFile()] } });
        await waitFor(() => expect(getAllByRole('fileitem').length).toEqual(3));

        jest.runAllTimers();

        expect(
            within(queryAllByRole('fileitem')[2]).getByTestId('read-only-text')
        ).toBeInTheDocument();

        const buttons = within(queryAllByRole('fileitem')[2]).queryAllByRole('button');
        expect(buttons[0]).toHaveAttribute('disabled');
        expect(buttons[1]).toHaveAttribute('disabled');
        jest.runAllTimers();
    });

    test('should test disabled component', async () => {
        mockFetch(true, 200, simpleResponse);

        const { rerender, getAllByRole, getByRole, findByTestId, queryByTestId, queryAllByRole } =
            render(<Manager viewFile={() => Promise.resolve()} disabled />);

        await findByTestId('file-container');

        queryAllByRole('button').forEach((btn) => expect(btn).toHaveAttribute('disabled'));

        const input = getByRole('fileinput', { hidden: true }) as HTMLInputElement;
        const root = getByRole('root');

        input.click = jest.fn();

        fireEvent.click(root);
        expect(input.click).not.toHaveBeenCalled();
        (input.click as jest.Mock).mockRestore();

        const event = createEventWithFiles([mockFile()]);

        fireEvent.dragEnter(root, event);
        expect(queryByTestId('label')).toBeNull();

        fireEvent.drop(root, event);
        expect(handleDropFiles).not.toHaveBeenCalled();
    });

    test('should test noClick & noDrag props', async () => {
        mockFetch(true, 200, simpleResponse);

        const { rerender, getAllByRole, getByRole, findByTestId, queryByTestId, queryAllByRole } =
            render(<Manager viewFile={() => Promise.resolve()} noDrag noClick />);

        await findByTestId('file-container');

        const input = getByRole('fileinput', { hidden: true }) as HTMLInputElement;
        const root = getByRole('root');

        input.click = jest.fn();

        fireEvent.click(root);
        expect(input.click).not.toHaveBeenCalled();
        (input.click as jest.Mock).mockRestore();

        const event = createEventWithFiles([mockFile()]);

        fireEvent.dragEnter(root, event);
        expect(queryByTestId('label')).toBeNull();

        fireEvent.drop(root, event);
        expect(handleDropFiles).not.toHaveBeenCalled();
    });

    test('should ignore keyboard events bubbling up the DOM tree', async () => {
        mockFetch(true, 200, []);

        const { getByTestId, getByText, getByRole } = render(
            <div>
                <Manager />
                <span data-testid="sibling" tabIndex={1}></span>
            </div>
        );
        await waitFor(() => expect(getByText('dragNdrop')).toBeInTheDocument());

        const input = getByRole('fileinput', { hidden: true }) as HTMLInputElement;
        input.click = jest.fn();

        const label = getByTestId('label');

        fireEvent.keyDown(label, { key: ' ' });
        expect(input.click).not.toHaveBeenCalled();
    });

    test('should test keyboard events (noKeyboard)', async () => {
        mockFetch(true, 200, simpleResponse);

        const { rerender, getAllByRole, getByRole, findByTestId, queryByTestId, queryAllByRole } =
            render(<Manager viewFile={() => Promise.resolve()} />);

        await findByTestId('file-container');

        const input = getByRole('fileinput', { hidden: true }) as HTMLInputElement;
        const root = getByRole('root');
        input.click = jest.fn();

        fireEvent.keyDown(root, { key: ' ' });
        expect(input.click).toBeCalledTimes(1);

        fireEvent.keyDown(root, { key: 'Enter' });
        expect(input.click).toBeCalledTimes(2);

        rerender(<Manager viewFile={() => Promise.resolve()} noKeyboard />);

        fireEvent.keyDown(root, { key: ' ' });
        expect(input.click).toBeCalledTimes(2);

        fireEvent.keyDown(root, { key: 'Enter' });
        expect(input.click).toBeCalledTimes(2);

        jest.runAllTimers();

        (input.click as jest.Mock).mockRestore();
    });

    test('should test preventDropOnDocument prop', async () => {
        mockFetch(true, 200, []);

        type params = Parameters<typeof document.addEventListener>;
        const eventListeners: Array<{ type: string }> = [];
        const realAddEventListener = document.addEventListener;

        // document.addEventListener = (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
        const addEventListenerFn: (...args: params) => void = (type, listener, options) => {
            realAddEventListener(type, listener, options);
            eventListeners.push({ type, listener, options });
            // console.log(type, listener, options);
        };
        document.addEventListener = addEventListenerFn;

        const { rerender, getAllByRole, getByRole, findByText, queryByTestId, queryAllByRole } =
            render(<Manager preventDropOnDocument={false} />);

        await findByText('dragNdrop');
        expect(eventListeners.length).toEqual(0);

        rerender(<Manager preventDropOnDocument />);
        expect(eventListeners.length).toEqual(2);
        expect(eventListeners[0].type).toEqual('dragover');
        expect(eventListeners[1].type).toEqual('drop');

        jest.runAllTimers();
        document.addEventListener = realAddEventListener;
    });

    test('should call the onChangeLocalFileStack event when adding or removing local files', async () => {
        mockFetch(true, 200, []);

        const onChangeLocalFileStack = jest.fn();

        const { rerender, getByRole, getAllByRole, findByTestId, findByText } = render(
            <Manager onChangeLocalFileStack={onChangeLocalFileStack} />
        );

        await findByText('dragNdrop');

        const input = getByRole('fileinput', { hidden: true }) as HTMLInputElement;
        const file = mockFile('ping.json', 10 * 1024, 'application/json');
        fireEvent.change(input, { target: { files: [file] } });

        await findByTestId('file-container');
        jest.runAllTimers();

        expect(onChangeLocalFileStack).toBeCalledTimes(1);
        expect(onChangeLocalFileStack).toHaveBeenCalledWith(
            [expect.any(Object)],
            expect.any(Object)
        );

        act(() => {
            getAllByRole('button')[1].click();
        });
        await findByText('dragNdrop');
        jest.runAllTimers();

        expect(onChangeLocalFileStack).toBeCalledTimes(2);
        expect(onChangeLocalFileStack).toHaveBeenCalledWith([], expect.any(Object));
        // screen.debug()
    });

    test('should call the onChangeItemMountStates event when the file items are mounted', async () => {
        mockFetch(true, 200, []);

        const onChangeItemMountStates = jest.fn();

        const { rerender, getByRole, getAllByRole, findByTestId, findByText } = render(
            <Manager onChangeItemMountStates={onChangeItemMountStates} />
        );

        await findByText('dragNdrop');
        expect(onChangeItemMountStates).toBeCalledTimes(0);

        const input = getByRole('fileinput', { hidden: true }) as HTMLInputElement;
        // let file = mockFile('ping.json', 10 * 1024, 'application/json');
        fireEvent.change(input, {
            target: { files: [mockFile('1.txt'), mockFile('2.txt'), mockFile('3.txt')] },
        });

        await findByTestId('file-container');
        expect(onChangeItemMountStates).toBeCalledTimes(1);
        expect(onChangeItemMountStates).toHaveBeenCalledWith(
            [expect.any(Object), expect.any(Object), expect.any(Object)],
            [expect.any(Object), expect.any(Object), expect.any(Object)],
            []
        );

        // sort files
        rerender(
            <Manager onChangeItemMountStates={onChangeItemMountStates} sortFiles={() => -1} />
        );

        expect(onChangeItemMountStates).toBeCalledTimes(2);
        expect(onChangeItemMountStates).toHaveBeenCalledWith(
            [],
            [expect.any(Object), expect.any(Object)],
            [expect.any(Object), expect.any(Object)]
        );

        act(() => {
            getAllByRole('button')[3].click();
        });
        jest.runAllTimers();

        expect(onChangeItemMountStates).toBeCalledTimes(3);
        expect(onChangeItemMountStates).toHaveBeenCalledWith(
            [expect.any(Object)],
            [expect.any(Object)],
            [expect.any(Object), expect.any(Object)]
        );
    });

    test('should call the onUnmountComponent event when the component was unmounted', async () => {
        mockFetch(true, 200, []);

        const onUnmountComponent = jest.fn();

        const { findByText, unmount } = render(<Manager onUnmountComponent={onUnmountComponent} />);

        await findByText('dragNdrop');

        unmount();

        expect(onUnmountComponent).toBeCalledTimes(1);
        expect(onUnmountComponent).toHaveBeenCalledWith(expect.any(Object), expect.any(Object));
    });
});

describe('FileManager exposed functions & props', () => {
    afterEach(() => {
        jest.clearAllTimers();
    });

    test('should test openFileDialog', async () => {
        mockFetch(true, 200, []);

        const openNCheck = (expectedClickCount: number) => {
            managerRef.current.openFileDialog();
            expect(input.click).toBeCalledTimes(expectedClickCount);
        };

        const { rerender, getByRole, findByText } = render(<Manager />);

        await findByText('dragNdrop');

        const input = getByRole('fileinput', { hidden: true }) as HTMLInputElement;
        input.click = jest.fn();

        openNCheck(1);

        rerender(<Manager readOnly />);
        openNCheck(1);

        rerender(<Manager disabled />);
        openNCheck(1);

        jest.runAllTimers();
        (input.click as jest.Mock).mockRestore();
    });

    test('should test addLocalFiles (add single file)', async () => {
        mockFetch(true, 200, []);


        const { getByTitle, queryAllByRole, findByText } = render(
            <Manager />
        );

        await findByText('dragNdrop');

        act(() => {
            managerRef.current.addLocalFiles(mockFile('1.txt'));
        });

        await waitFor(() => expect(queryAllByRole('fileitem').length).toEqual(1));
        expect(getByTitle('1.txt')).toBeInTheDocument();
    });


    test('should test addLocalFiles (add FileList)', async () => {
        mockFetch(true, 200, []);

        const { create, restore } = mockFileList();

        const { getByTitle, queryAllByRole, findByText } = render(
            <Manager />
        );

        await findByText('dragNdrop');

        const fileList = create(mockFile('1.txt'), mockFile('2.txt'))

        act(() => {
            managerRef.current.addLocalFiles(fileList);
        });

        await waitFor(() => expect(queryAllByRole('fileitem').length).toEqual(2));
        expect(getByTitle('1.txt')).toBeInTheDocument();
        expect(getByTitle('2.txt')).toBeInTheDocument();

        restore();
    });


    test('addLocalFiles should ignore adding an object that is not a file', async () => {
        mockFetch(true, 200, []);

        const { queryAllByRole, findByText } = render(
            <Manager />
        );

        await findByText('dragNdrop');

        const files = [mockFile('1.txt'), { name: 'fakeFile', size: 1024 }] as File[]

        act(() => {
            managerRef.current.addLocalFiles(files);
        });

        await waitFor(() => expect(queryAllByRole('fileitem').length).toEqual(1));
    });


    test('should test removeAllLocalFiles', async () => {
        mockFetch(true, 200, simpleResponse);

        const onChangeLocalFileStack = jest.fn();

        const removeNCheck = (expectedFileNum: number) => {
            act(() => {
                managerRef.current.removeAllLocalFiles();
            });
            expect(queryAllByRole('fileitem').length).toEqual(expectedFileNum);
        };

        const { rerender, getByRole, findByTestId, queryAllByRole } = render(
            <Manager onChangeLocalFileStack={onChangeLocalFileStack} />
        );

        await findByTestId('file-container');

        const input = getByRole('fileinput', { hidden: true }) as HTMLInputElement;
        fireEvent.change(input, { target: { files: [mockFile('1.txt'), mockFile('2.txt')] } });
        await waitFor(() => expect(queryAllByRole('fileitem').length).toEqual(4));

        removeNCheck(2);
        jest.runAllTimers();
        expect(onChangeLocalFileStack).toBeCalledTimes(2);

        fireEvent.change(input, { target: { files: [mockFile('1.txt'), mockFile('2.txt')] } });
        await waitFor(() => expect(queryAllByRole('fileitem').length).toEqual(4));

        rerender(<Manager readOnly />);
        removeNCheck(4);

        rerender(<Manager disabled />);
        removeNCheck(4);
    });

    test('should test reloadRemoteFiles and check uploaded & local files', async () => {
        mockFetch(true, 200, []);

        const { getByRole, findByText, queryAllByRole } = render(<Manager />);
        await findByText('dragNdrop');

        expect(managerRef.current.remoteFiles.length).toEqual(0);
        expect(managerRef.current.localFiles.length).toEqual(0);

        mockFetch(true, 200, simpleResponse);

        act(() => {
            managerRef.current.reloadRemoteFiles();
        });
        await waitFor(() => expect(queryAllByRole('fileitem').length).toEqual(2));

        expect(managerRef.current.remoteFiles.length).toEqual(2);
        expect(managerRef.current.localFiles.length).toEqual(0);

        const input = getByRole('fileinput', { hidden: true }) as HTMLInputElement;
        fireEvent.change(input, { target: { files: [mockFile('1.txt')] } });
        await waitFor(() => expect(queryAllByRole('fileitem').length).toEqual(3));

        expect(managerRef.current.remoteFiles.length).toEqual(2);
        expect(managerRef.current.localFiles.length).toEqual(1);

        expect(managerRef.current.remoteFiles[0].fileName).toEqual('readOnly.pdf');
        expect(managerRef.current.localFiles[0].fileName).toEqual('1.txt');
    });

    test('should throw a file field mapping error', async () => {
        mockFetch(true, 200, []);

        const { findByText, queryAllByRole } = render(<Manager />);
        await findByText('dragNdrop');

        mockFetch(true, 200, [
            {
                file_id: '18c27',
                file_name: 'readOnly.pdf',
                file_size: 100 * 1024,
                file_type: 'PDF',
            },
        ]);

        // expect.assertions(2);

        act(() => {
            // managerRef.current.reloadRemoteFiles()
            // .catch(err => {
            //     expect(err.message).toBe(errorTxtInvalidFileFields)
            // })
            expect(async () => await managerRef.current.reloadRemoteFiles()).rejects.toThrow(
                errorTxtInvalidFileFields
            );
        });

        await waitFor(() => expect(queryAllByRole('fileitem').length).toEqual(0));
    });

    // it.only('test', done => {
    //     done('should throw an error');
    // })

    // test.only('should not throw an error after fetching downloaded files when the component is already unmounted', async () => {
    //
    //     mockFetch(true, 200, []);
    //
    //     const { findByText, container, unmount } = render(
    //         <Manager />
    //     );
    //     await findByText('dragNdrop');
    //
    //
    //     // set incorrect fetch response with 100ms delay
    //     mockFetch(true, 200, [{err: 'bad response'}], 100);
    //
    //     // we use assert count check to fail the test
    //     expect.assertions(2);
    //
    //     act(() => {
    //       managerRef.current.reloadRemoteFiles()
    //       .then(result => {
    //           // if the assertion is false, it does not fail the test,
    //           // so we use 'expect.assertions'
    //           expect(result).toEqual([]);
    //       })
    //       .catch((err) => {
    //           // this statement must be true, otherwise it throws another error,
    //           // which must be caught by another catch clause
    //           console.error(err);
    //           expect(1).toBe(1);
    //       })
    //     });
    //
    //     await findByText('loading');
    //
    //     unmount();
    //     expect(container.innerHTML).toBe('');
    //     jest.runAllTimers()
    //
    // });

    // same test as above but using "done" callback
    test('should not throw an error after fetching downloaded files when the component is already unmounted', (done) => {
        mockFetch(true, 200, []);

        const { findByText, container, unmount } = render(<Manager />);

        findByText('dragNdrop')
            .then(async () => {
                // set incorrect fetch response with 100ms delay
                mockFetch(true, 200, [{ err: 'bad response' }], 100);

                act(() => {
                    managerRef.current
                        .reloadRemoteFiles()
                        .then((result) => {
                            expect(result).toEqual([]);
                            done();
                        })
                        .catch((err: Error) => {
                            if (err.message.includes('expect(received).toEqual(expected)'))
                                done(err);
                        });
                });

                // return findByText('loading')
                // .then(() => {
                //     unmount();
                //     expect(container.innerHTML).toBe('');
                //     jest.runAllTimers();
                // });

                await findByText('loading');
                unmount();
                expect(container.innerHTML).toBe('');
                jest.runAllTimers();
            })
            .catch((err) => done(err));
    });
});

describe('FileManager file validation', () => {
    afterEach(() => {
        jest.clearAllTimers();
    });

    test('should check basic restrictions when adding files', async () => {
        mockFetch(true, 200, []);

        const { rerender, getByRole, getByTestId, findByTestId, findByText } = render(
            <Manager accept="image/*" />
        );

        await findByText('dragNdrop');

        // check for the invalid_type error
        const input = getByRole('fileinput', { hidden: true }) as HTMLInputElement;
        let file = mockFile('ping.json', 10 * 1024, 'application/json');
        fireEvent.change(input, { target: { files: [file] } });

        expect(acceptedFiles.length).toEqual(0);
        expect(fileRejections.length).toEqual(1);
        expect(handleErrors).toBeCalledTimes(1);
        expect(errorId).toEqual('invalid_type');

        // check for the invalid_size_min error
        rerender(<Manager minFileSize={12 * 1024} maxFileSize={20 * 1024} />);

        fireEvent.change(input, { target: { files: [file] } });

        expect(handleErrors).toBeCalledTimes(2);
        expect(errorId).toEqual('invalid_size_min');

        // check for the invalid_size_max error
        file = mockFile('ping.json', 21 * 1024, 'application/json');
        fireEvent.change(input, { target: { files: [file] } });

        expect(handleErrors).toBeCalledTimes(3);
        expect(errorId).toEqual('invalid_size_max');

        // if file type is empty and its size equals to 0, we assume that it's a folder and ignore it
        errorId = null;
        file = new File([], 'folder', { type: '' });
        fireEvent.change(input, { target: { files: [file] } });

        expect(handleErrors).toBeCalledTimes(3);
        expect(errorId).toBeNull();
    });

    test('should check for file duplicates when adding files', async () => {
        const expectError = (expectedErrorId: string | string[] = 'file_exists') => {
            expect(acceptedFiles.length).toEqual(0);
            expect(fileRejections.length).toEqual(1);
            // if(Array.isArray(errorId)) errorId = errorId[0];
            expect(errorId).toEqual(expectedErrorId);
            errorId = null;
        };

        const expectFileAcceptance = async (totalFileItemNumber: number) => {
            await waitFor(() =>
                expect(queryAllByRole('fileitem').length).toEqual(totalFileItemNumber)
            );
            expect(acceptedFiles.length).toEqual(1);
            expect(fileRejections.length).toEqual(0);
        };

        mockFetch(true, 200, simpleResponse);

        // reject all file duplicates
        const { rerender, getByRole, getByTestId, findByTestId, queryAllByRole, findByTitle } =
            render(<Manager ignoreFileDuplicates="none" />);

        await findByTestId('file-container');
        const input = getByRole('fileinput', { hidden: true }) as HTMLInputElement;

        // adds a local file that matches the remote file in the list
        const file1 = mockFile(
            simpleResponse[0].fileName,
            simpleResponse[0].fileSize,
            'application/pdf'
        );
        fireEvent.change(input, { target: { files: [file1] } });
        expectError();

        // adds a local file that differs from the files in the list
        const file2 = mockFile();
        fireEvent.change(input, { target: { files: [file2] } });
        await expectFileAcceptance(3);

        // attempt to add the same local file should throw an error
        fireEvent.change(input, { target: { files: [file2] } });
        expectError();

        // accept local file duplicates only
        rerender(<Manager ignoreFileDuplicates="remote" />);

        // adds a local file that is already exists in the list
        fireEvent.change(input, { target: { files: [file2] } });
        await expectFileAcceptance(4);

        // adds a local file that matches the remote file in the list
        fireEvent.change(input, { target: { files: [file1] } });
        expectError();

        // accept remote file duplicates only
        rerender(<Manager ignoreFileDuplicates="local" />);

        // adds a local file that is already exists in the list
        fireEvent.change(input, { target: { files: [file1] } });
        await expectFileAcceptance(5);

        // adds a local file that matches the remote file in the list
        fireEvent.change(input, { target: { files: [file2] } });
        expectError(new Array(2).fill('file_exists')); // = ["file_exists", "file_exists"]

        // accept all file duplicates
        rerender(<Manager ignoreFileDuplicates="all" />);

        // adds a local file that matches the remote file in the list
        fireEvent.change(input, { target: { files: [file1] } });
        await expectFileAcceptance(6);

        // adds a local file that matches the remote file in the list
        fireEvent.change(input, { target: { files: [file2] } });
        await expectFileAcceptance(7);
    });

    test('should check custom file validation', async () => {
        mockFetch(true, 200, simpleResponse);

        const handleFileValidation: TFileValidator = (file, local, remote) => {
            const maxLength = 20;
            if (file.name.length > maxLength) {
                // file name is larger than 20 symbols
                return {
                    errorId: 'name-too-large',
                    message: `Name is larger than ${maxLength} characters`,
                    data: { file, maxLength },
                };
            }
            return null;
        };

        // reject all file duplicates
        const { rerender, getByRole, getByTestId, findByTestId, queryAllByRole, findByTitle } =
            render(<Manager fileValidator={handleFileValidation} />);

        await findByTestId('file-container');
        const input = getByRole('fileinput', { hidden: true }) as HTMLInputElement;

        // should pass
        let file = mockFile('short.txt');
        fireEvent.change(input, { target: { files: [file] } });
        await waitFor(() => expect(queryAllByRole('fileitem').length).toEqual(3));
        expect(acceptedFiles.length).toEqual(1);

        // should throw an error
        file = mockFile('very long file name.txt');
        fireEvent.change(input, { target: { files: [file] } });
        expect(fileRejections.length).toEqual(1);
        // if(Array.isArray(errorId)) errorId = errorId[0];
        expect(errorId).toEqual('name-too-large');

        // should return an array of errors
        rerender(
            <Manager
                fileValidator={(file, local, remote) => {
                    return [
                        { errorId: 'custom_error', message: 'error 1' },
                        { message: 'error 2' },
                    ];
                }}
            />
        );

        fireEvent.change(input, { target: { files: [file] } });
        expect(errorId).toEqual(['custom_error', 'validation_error']);
    });

    test('should test multiple file mode', async () => {
        mockFetch(true, 200, []);

        const { rerender, getByRole, queryAllByRole, findByText } = render(
            <Manager multiple={false} />
        );

        await findByText('dragNdrop');
        let input = getByRole('fileinput', { hidden: true }) as HTMLInputElement;
        expect(input).not.toHaveAttribute('multiple');

        const files = [mockFile('file1'), mockFile('file2')];
        fireEvent.change(input, { target: { files } });
        await waitFor(() => expect(queryAllByRole('fileitem').length).toEqual(1));
        expect(acceptedFiles.length).toEqual(1);
        expect(fileRejections.length).toEqual(1);
        expect(errorId).toEqual('multiple_not_allowed');
        errorId = null;

        // multiple mode
        rerender(<Manager ignoreFileDuplicates="all" />);

        input = getByRole('fileinput', { hidden: true }) as HTMLInputElement;
        expect(input).toHaveAttribute('multiple');

        fireEvent.change(input, { target: { files } });
        await waitFor(() => expect(queryAllByRole('fileitem').length).toEqual(3));
        expect(acceptedFiles.length).toEqual(2);
        expect(fileRejections.length).toEqual(0);
        expect(errorId).toBeNull();
    });

    test('should check if the maximum number of files is exceeded', async () => {
        mockFetch(true, 200, []);

        const { rerender, getByRole, getByTestId, findByTestId, queryAllByRole, findByText } =
            render(<Manager maxFileCount={3} ignoreFileDuplicates="all" />);

        await findByText('dragNdrop');
        const input = getByRole('fileinput', { hidden: true }) as HTMLInputElement;

        const files = [mockFile('file1'), mockFile('file2'), mockFile('file3'), mockFile('file4')];
        fireEvent.change(input, { target: { files } });
        await waitFor(() => expect(queryAllByRole('fileitem').length).toEqual(3));
        expect(acceptedFiles.length).toEqual(3);
        expect(fileRejections.length).toEqual(1);
        expect(errorId).toEqual('exceed_max_file_count');
    });
});
