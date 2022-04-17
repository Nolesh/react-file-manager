import React from 'react';

import { Typography } from '@material-ui/core';

import FileManager, {
    IFileData,
    IRemoteFileData,
    TFileValidator,
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

const handleErrors: TOnError = (err) => {
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
    fetchRemoteFiles: () => {
        return request('fetchFiles').then((res) => res.json());
    },
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

// Custom file validation
const fileValidator: TFileValidator = (file, local, remote) => {
    // return [
    //     { message: `My custom validation error #1` },
    //     { message: `My custom validation error #2` }
    // ];

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

const Component = () => {
    return (
        <>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Typography variant="h5" style={{ padding: 10 }}>
                    An example of applying various checks for a file
                    <ul style={{ fontSize: 15 }}>
                        <li>
                            Custom validation that checks file name length (&#60;&#61;20 symbols)
                        </li>
                        <li>Ignore duplicates for local and remote files</li>
                        <li>The maximum number of files is 6</li>
                        <li>The maximum file size is 2 Mb</li>
                        <li>The minimum file size is 100 kB</li>
                        <li>Accept only image files</li>
                    </ul>
                </Typography>
            </div>

            <FileManager
                {...basicParams}
                fileValidator={fileValidator}
                ignoreFileDuplicates="all" // none | local | remote | all
                maxFileCount={6}
                maxFileSize={1024 * 1024 * 2} // 2 Mb
                minFileSize={1024 * 100} // 100 kB
                accept={'image/*'}
            />
        </>
    );
};

export default Component;
