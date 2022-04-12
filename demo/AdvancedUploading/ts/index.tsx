import React, { useRef, useState, useCallback } from 'react';

import { Button, Checkbox, FormControlLabel, Typography } from '@material-ui/core';

import FileManager, { IFileManagerRef, TOnError, TGetUploadParams } from '../../../src/lib';
import 'react-file-manager-css';

type TRequestFunc = (
    url: string,
    method?: 'GET' | 'POST' | 'DELETE' | 'PATCH',
    body?: Record<string, unknown> | null
) => Promise<any>;

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

const getUploadParams: TGetUploadParams = (localFileData) =>
    Array.isArray(localFileData)
        ? {
              // Upload multiple files in one request
              fileFieldName: 'fileToUpload',
              URL: `/api/multipleFileUpload`,
              headers: {
                  // Let's pass additional parameters to the server such as fileId and description using headers
                  attachments: JSON.stringify(
                      localFileData.map((fileData) => ({
                          fileId: fileData.uid,
                          description: encodeURIComponent(fileData.description),
                      }))
                  ),
              },
              // If the server returns anything other than uploaded file data,
              // we should return localFileData passed as function argument to use the internal file data.
              processResponse: (response) => (response.result === true ? localFileData : 'fail'),
              checkResult: (result) => !(result === 'fail'),
              processError: getErrorMessage,
          }
        : {
              // Standard uploading method
              fileFieldName: 'fileToUpload',
              URL: `/api/singleFileUpload`,
              // Let's pass additional parameters to the server such as fileId and description using FormData fields
              fields: {
                  fileId: localFileData.uid,
                  description: localFileData.description,
              },
              // Extracts an array of files or a single file from an object because response was deliberately wrapped in an object
              processResponse: (response) => response?.file ?? response?.files,
              checkResult: (result) => result.file_id === localFileData.uid,
              processError: getErrorMessage,
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

const Component = () => {
    const ref = useRef<IFileManagerRef>();
    const progressRef = useRef<HTMLDivElement>();

    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const [state, setState] = useState<{
        autoUpload: boolean;
        uploadFilesInOneRequest: boolean;
    }>({
        autoUpload: false,
        uploadFilesInOneRequest: false,
    });

    const handleChange = (name: string, value: boolean) => {
        setState((state) => ({ ...state, [name]: value }));
        setTimeout(ref.current.update);
    };

    return (
        <>
            <div style={{ textAlign: 'center' }}>
                <Typography variant="h5" style={{ padding: 10 }}>
                    This example demonstrates various upload settings and the ability to rename
                    files
                </Typography>

                <div className="checkbox-wrapper">
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={state.autoUpload}
                                onChange={(e, value) => handleChange('autoUpload', value)}
                            />
                        }
                        label="Auto Upload"
                    />
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={state.uploadFilesInOneRequest}
                                onChange={(e, value) =>
                                    handleChange('uploadFilesInOneRequest', value)
                                }
                            />
                        }
                        label="Upload Files In One Request"
                    />
                </div>

                <FileManager
                    ref={ref}
                    fetchRemoteFiles={() => {
                        return request('fetchFiles').then((res) => res.json());
                    }}
                    fileFieldMapping={(data) => ({
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
                        // ...data
                    })}
                    getUploadParams={getUploadParams}
                    onFilesUploaded={(fileData) => {
                        console.log('onFileUploaded', fileData);
                    }}
                    viewFile={(fileData) => {
                        return request(`file/${fileData.fileName}`).then((resp) => resp.blob());
                    }}
                    downloadFile={(fileData) => {
                        return request(`file/${fileData.fileName}`).then((resp) => resp.blob());
                    }}
                    deleteFile={(fileData) => {
                        console.log('deleteFile', fileData);
                        return new Promise((resolve, reject) => {
                            if (window.confirm('Are you sure you want to delete this file?')) {
                                request(`file/${fileData.uid}`, 'DELETE')
                                    .then((response) => response.json())
                                    .then((resp) => {
                                        if (resp.result) resolve();
                                        else reject(resp.error);
                                    })
                                    .catch((err) => reject(err));
                            } else reject();
                        });
                    }}
                    setFileDescription={(fileData) => {
                        console.log('setFileDescription', fileData.description);

                        return request(`file/${fileData.uid}`, 'PATCH', {
                            description: fileData.description,
                        }).then((response) => response.text());
                        // .catch(err => console.error(err))
                    }}
                    onUploadProgress={(progress, sentBytes, totalBytes) => {
                        console.log('progress', progress, sentBytes, totalBytes);
                        progressRef.current.style.display = !!progress ? 'block' : 'none';
                        progressRef.current.style.width = `${progress ?? 0}%`;
                    }}
                    onLoading={(isLoading, isUploading) => {
                        setIsLoading(isLoading || isUploading);
                        setIsUploading(isUploading);
                    }}
                    onError={handleErrors}
                    autoUpload={state.autoUpload}
                    uploadFilesInOneRequest={state.uploadFilesInOneRequest}
                    addFileDescription
                />
            </div>

            <div className="progress-bar-wrapper">
                <div ref={progressRef} className="progress-bar"></div>
            </div>

            <div className="button-container">
                <Button
                    variant="contained"
                    color="primary"
                    style={{ margin: 10, width: 200 }}
                    onClick={() => ref.current.openFileDialog()}
                    // disabled={isLoading}
                >
                    Add file(s)
                </Button>

                <Button
                    variant="contained"
                    color="secondary"
                    style={{ margin: 10, width: 200 }}
                    onClick={() => ref.current.removeAllLocalFiles()}
                    // disabled={isLoading}
                >
                    Remove local files
                </Button>
                {!isUploading && (
                    <Button
                        variant="contained"
                        style={{ margin: 10, width: 200 }}
                        onClick={() =>
                            ref.current.upload().then((result) => {
                                if (result)
                                    console.log('The file upload process is completed', result);
                                // ref.current.reloadRemoteFiles().then(() => console.log('Files have been reloaded'))
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
                        onClick={() => ref.current.cancelUpload()}
                    >
                        Cancel Upload
                    </Button>
                )}
                <Button
                    variant="contained"
                    color="primary"
                    style={{ margin: 10, width: 200 }}
                    onClick={() => {
                        ref.current.reloadRemoteFiles().then((remoteFiles) => {
                            console.log('reloadRemoteFiles', remoteFiles);
                        });
                    }}
                >
                    Reload
                </Button>
            </div>
        </>
    );
};

export default Component;
