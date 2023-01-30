import React, { useRef, useState, useEffect, useCallback } from 'react';

import { Button, Typography } from '@material-ui/core';

import FileManager, {
    IFileData,
    IFileManagerRef,
    IRemoteFileData,
    TOnError,
    TGetUploadParams,
} from '../../../src/lib';
import 'react-file-manager-css';

type TRequestFunc = (
    url: string,
    method?: 'GET' | 'POST' | 'DELETE',
    body?: Record<string, unknown> | null
) => Promise<any>;

interface IBasicParams {
    fetchRemoteFiles: () => Promise<IFileData[]>;
    fileFieldMapping: (fileData: any) => IFileData;
    getUploadParams: TGetUploadParams;
    onError: TOnError;
}

// Retrieves the error message from the server error response
// Since our error response is an object containing a status and a message,
// we need to convert it to a string
const getErrorMessage = (error: { status: number; message: string }) => error.message;

const request: TRequestFunc = (url, method = 'GET', body = null) => {
    return fetch(`/api/${url}`, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
    }).then(async (response) => {
        if (!response.ok) {
            // gets error information from the response body
            const errorInfo = await response.json();
            return Promise.reject(getErrorMessage(errorInfo));
        }
        return Promise.resolve(response);
    });
};

const fetchRemoteFiles = () => request('fetchFiles').then((res) => res.json());

const handleErrors: TOnError = (err) => {
    console.log(err);
    if (Array.isArray(err)) {
        const messages = err.reduce(
            (acc, val, indx) => acc.concat(`${indx + 1}. ${val.message}\n`),
            ''
        );
        alert(messages);
    } else {
        alert(err.message);
    }
};

const basicParams: IBasicParams = {
    fetchRemoteFiles,
    fileFieldMapping: (data) => ({
        // We can omit this option if the component file fields are the same as the server fields.
        // We intentionally made them different to show how the files can be matched
        uid: data.file_id, // optional
        fileName: data.file_name, // required
        fileSize: data.file_size, // required
        fileType: data.file_type, // optional
        description: data.description, // optional
        previewData: {
            src: data.thumbnail, // optional
        },
        readOnly: data.read_only, // optional
        disabled: data.disabled, // optional
    }),
    getUploadParams: (localFileData) => ({
        URL: `/api/singleFileUpload`,
        // If the server returns anything other than uploaded file data,
        // we should return localFileData passed as function argument to use the internal file data.
        processResponse: (response) => localFileData,
        processError: getErrorMessage,
    }),
    onError: handleErrors,
};

const Component = () => {
    const fileManagerRef = useRef<IFileManagerRef>();
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isDescSort, setIsDescSort] = useState(false);

    const handleSorting = useCallback(
        (a, b) => {
            // sort by file type (local or remote)
            const fileTypeResult = a.isLocalFile === b.isLocalFile ? 0 : a.isLocalFile ? -1 : 1;
            // sort by file size
            const fileSizeResult = isDescSort
                ? b.fileData.fileSize - a.fileData.fileSize
                : a.fileData.fileSize - b.fileData.fileSize;

            return fileTypeResult || fileSizeResult;
        },
        [isDescSort]
    );

    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            if (e.clipboardData.files.length) {
                const files = e.clipboardData.files;
                fileManagerRef.current.addLocalFiles(files); // use this function to add files from the clipboard
            } else
                alert('No data found in the clipboard. Copy an image first or take a screenshot');
        };

        const onDocumentDrop = (event: DragEvent) => event.preventDefault();

        document.addEventListener('dragover', onDocumentDrop, false);
        document.addEventListener('drop', onDocumentDrop, false);
        document.addEventListener('paste', handlePaste);
        return () => {
            document.removeEventListener('dragover', onDocumentDrop);
            document.removeEventListener('drop', onDocumentDrop);
            document.removeEventListener('paste', handlePaste);
        };
    }, []);

    return (
        <>
            <div style={{ textAlign: 'center' }}>
                <Typography variant="h5" style={{ padding: 10 }}>
                    Use the ref exposed by the &#39;ReactFileManager&#39; component to perform some
                    actions programmatically.
                    <br />
                    Paste a clipboard image into this document to add files.
                </Typography>

                <FileManager
                    {...basicParams}
                    ref={fileManagerRef}
                    noClick
                    accept="image/*"
                    sortFiles={handleSorting} // overrides the sorting controlled in the header
                    onLoading={(isLoading, isUploading) => {
                        setIsLoading(isLoading || isUploading);
                        setIsUploading(isUploading);
                    }}
                    overrides={{
                        Root: {
                            hideFooter: true, // hides footer
                            hideHeader: true, // hides header
                        },
                    }}
                />
            </div>

            <div className="button-container">
                <Button
                    variant="contained"
                    color="primary"
                    style={{ margin: 10, width: 200 }}
                    onClick={() => fileManagerRef.current.openFileDialog()}
                    // disabled={isLoading}
                >
                    Add file(s)
                </Button>

                <Button
                    variant="contained"
                    color="secondary"
                    style={{ margin: 10, width: 200 }}
                    onClick={() => fileManagerRef.current.removeAllLocalFiles()}
                    // disabled={isLoading}
                >
                    Remove local files
                </Button>
                {!isUploading && (
                    <Button
                        variant="contained"
                        style={{ margin: 10, width: 200 }}
                        onClick={() =>
                            fileManagerRef.current.upload().then((result) => {
                                if (result)
                                    console.log('The file upload process is completed', result);
                                // fileManagerRef.current.fetchRemoteFiles().then(() => console.log('Files have been reloaded'))
                                // .catch(err => console.error('An error occurred during reloading files', err))
                            })
                        }
                        disabled={isLoading}
                    >
                        Upload files
                    </Button>
                )}
                {isUploading && (
                    <Button
                        variant="contained"
                        color="secondary"
                        style={{ margin: 10, width: 200 }}
                        onClick={() => fileManagerRef.current.cancelUpload()}
                    >
                        Cancel Upload
                    </Button>
                )}
                <Button
                    variant="contained"
                    color="primary"
                    style={{ margin: 10, width: 200 }}
                    onClick={() => {
                        // fileManagerRef.current.fetchRemoteFiles().then((remoteFiles) => {
                        //     console.log('fetchRemoteFiles', remoteFiles);
                        // });
                        fileManagerRef.current
                            .fetchRemoteFiles(fetchRemoteFiles)
                            .then((remoteFiles) => {
                                console.log('fetchRemoteFiles', remoteFiles);
                            });
                    }}
                >
                    Fetch Remote Files
                </Button>

                <Button
                    variant="contained"
                    color="primary"
                    style={{ margin: 10, width: 200 }}
                    onClick={() => {
                        setIsDescSort((val) => !val);
                        setTimeout(fileManagerRef.current.update);
                    }}
                >
                    {isDescSort ? 'Sort Ascending' : 'Sort Descending'}
                </Button>
            </div>
        </>
    );
};

export default Component;
