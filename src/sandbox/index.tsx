import React, {
    FC,
    ReactElement,
    Ref,
    useRef,
    useState,
    useEffect,
    forwardRef,
    ForwardRefExoticComponent,
    RefAttributes,
} from 'react';

const PDFJS = require('pdfjs-dist/webpack');

import '../lib/styles.scss';

import FileManager, {
    IFileManagerProps,
    IFileManagerRef,
    TSortFunc,
    TGetUploadParams,
    TFileValidator,
    TOnError,
    ILocalFileData,
} from '../lib';

import { Button, Checkbox, FormControlLabel, Paper, Typography } from '@material-ui/core';
import { overrides } from './customization';

const uploadFilesInOneRequest = false;
const uploadFileURL = '/rest';

// Retrieves the error message from the server error response
// Since our error response is an object containing a status and a message,
// we need to convert it to a string
const getErrorMessage = (error: { status: number; message: string }) =>
    `${error.message}${error.status ? ' (' + error.status + ')' : ''} `;
// Or simply
// error.message

const request = (
    url: string,
    method = 'GET',
    body: Record<string, unknown> | null = null
): Promise<any> => {
    return fetch(`/api/${url}`, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
    }).then(async (response) => {
        if (!response.ok) {
            // gets error information from the response body
            // const errorInfo = (await response.json()) as { status: number; message: string };
            // return Promise.reject(errorInfo.message);
            const errorInfo = await response.json();
            console.log('errorInfo', errorInfo);
            return Promise.reject(getErrorMessage(errorInfo));
        }
        return Promise.resolve(response);
        // return Promise.reject('test-error');
    });
};

const fetchRemoteFiles = () => {
    return request('fetchFiles').then((res) => res.json());
    // return Promise.reject()
    // return Promise.resolve({} as any)
    // return Promise.resolve([])
};

// ----------------------------------------------------------------------------------------------
// Upload multiple files in one request
const uploadFilesInOneRequestParams: TGetUploadParams = (localFileData: ILocalFileData[]) => ({
    URL: `/api/multipleFileUpload`,
    headers: {
        // Let's pass additional parameters to the server such as fileId and description using headers
        attachments: JSON.stringify(
            localFileData.map((fileData) => ({
                fileId: fileData.uid,
                ...((!!fileData.description && {
                    description: encodeURIComponent(fileData.description),
                }) ||
                    {}),
            }))
        ),

        // 'Content-Type': 'application/octet-stream',
        // fileNames: encodeURIComponent(files.map(f => f.fileName).join('☆')),
        // fileSizes: encodeURIComponent(files.map(f => f.fileSize).join('☆'))
    },
    fileFieldName: 'fileToUpload',
    // fields: {
    //     fileIds: JSON.stringify(files.map(f => f.uid)),
    //     ...(( !!files.some(f => f.description) && {descriptions: JSON.stringify(files.map(f => f.description)) }) || {})
    // },
    // body: new Blob(files.map(f => f.file)),
    // method: 'PUT',
    // timeout: 0,
    // If the server returns anything other than uploaded file data, we should return one of the following:
    // 1. correct file data (must match data returned by fileFieldMapping) created from the response
    // 2. files passed as function argument
    // 3. null (remove uploaded files from the list)
    processResponse: (response) => (response.result ? localFileData : 'fail'),
    // processResponse: (response) => localFileData,
    checkResult: (result) => !(result === 'fail'),
    processError: getErrorMessage,
});

const uploadFilesStandardParams: TGetUploadParams = (localFileData: ILocalFileData) => ({
    URL: `/api/singleFileUpload`,
    headers: {
        // attachment: JSON.stringify({
        //     fileId: localFileData.uid,
        //     ...((!!localFileData.description && { description: encodeURIComponent(localFileData.description) }) || {}),
        // }),
        // 'Content-Type': 'application/octet-stream',
        // 'filename': localFileData.fileName
    },
    // Let's pass additional parameters to the server such as fileId and description using FormData fields
    fields: {
        fileId: localFileData.uid,
        ...((!!localFileData.description && { description: localFileData.description }) || {}),
    },
    fileFieldName: 'fileToUpload',
    // body: Array.isArray(localFileData) ? new Blob(localFileData.map(x => x.file)) : localFileData.file,
    // method: 'PUT',
    // timeout: 0,
    // Extracts an array of files or a single file from an object because response was deliberately wrapped in an object
    // processResponse: (response) => response?.file ?? response?.files,
    processResponse: (response) => localFileData,
    // checkResult: (result) => result.file_id === localFileData.uid,
    processError: getErrorMessage,
});

const uploadFileParams: TGetUploadParams = (localFileData) =>
    // Array.isArray(localFileData)
    // OR
    uploadFilesInOneRequest
        ? uploadFilesInOneRequestParams(localFileData)
        : uploadFilesStandardParams(localFileData);

// ----------------------------------------------------------------------------------------------

const generateFilePreview: IFileManagerProps['filePreview'] = (file) => {
    if (file.type === 'application/pdf') {
        const promise = new Promise<string>((resolve) => {
            const objectUrl = URL.createObjectURL(file);
            PDFJS.getDocument(objectUrl).promise.then((pdf: any) => {
                pdf.getPage(1).then((page: any) => {
                    const scale = '1.5';
                    const viewport = page.getViewport({
                        scale: scale,
                    });
                    const canvas = document.createElement('canvas');
                    const canvasContext = canvas.getContext('2d');
                    canvas.height =
                        viewport.height || viewport.viewBox[3]; /* viewport.height is NaN */
                    canvas.width =
                        viewport.width || viewport.viewBox[2]; /* viewport.width is also NaN */
                    page.render({
                        canvasContext,
                        viewport,
                    }).promise.then(() => resolve(canvas.toDataURL()));
                });
            });
        });

        // Prevents a long loading process (optional)
        const result = Promise.race([
            promise,
            new Promise<void>((resolve) => {
                setTimeout(resolve, 1000);
            }),
        ]).then((result) => {
            if (!result) console.warn('It takes too long to create a PDF thumbnail');
            return result;
        });

        return result;
    }
    // Overrides the default implementation for video files
    // Will take effect if thumbnail is overridden by CustomFileItemThumbnail
    // else if (file.type.startsWith('video/')) {
    //     return new Promise((resolve) => {
    //         const objectUrl = URL.createObjectURL(file);
    //         const video = document.createElement('video');
    //         video.src = objectUrl;
    //         video.onloadedmetadata = () => {
    //             const { duration, videoWidth, videoHeight } = video;
    //             resolve({ src: objectUrl, duration, videoWidth, videoHeight, tag: 'video' });
    //         };
    //     });
    // }
    // Overrides default implementation for images
    // else if(file.type.startsWith('image/')){
    //   const imageUrl = URL.createObjectURL(file);
    //   return Promise.resolve(imageUrl);
    // }
    // Prevent the default implementation if the file type is audio
    // else if (file.type.startsWith('audio/')) {
    //     return Promise.reject();
    // }

    return Promise.resolve(); // We must return a promise that resolves with a 'null' or 'undefined' to use the default implementation for the rest file types
    // return Promise.reject(); // If we want to prevent the default implementation for the rest file types
};

const handleSorting: TSortFunc = (a, b) => {
    // return 1;

    // sort by file type (local or remote)
    const fileTypeResult = a.isLocalFile === b.isLocalFile ? 0 : a.isLocalFile ? -1 : 1;
    // sort by file size
    const fileSizeResult = a.fileData.fileSize - b.fileData.fileSize;

    return fileTypeResult || fileSizeResult;
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

const viewFile: IFileManagerProps['viewFile'] = (fileData) => {
    console.log('viewFile', fileData);

    // Case 1: get a resource via a direct link.

    // window.open(`api/file/${fileData.fileName}?view=true`, '_blank');
    window.open(`api/file/${fileData.fileName}?view=true`);
    return Promise.resolve();

    // Case 2: requests a blob from the server and handles the error if it exists

    // return request(`file/${fileData.fileName}`)

    //     .then((resp) => resp.blob());

    //     // .then(async resp => {
    //     //     if (!resp.ok) {
    //     //         const errorInfo = await resp.json() as { status: number, message: string };
    //     //         throw errorInfo;
    //     //     }
    //     //     else return await resp.blob();
    //     // });

    // Case 3: custom implementation

    // if(!fileData?.previewData?.src) return Promise.reject('Something went wrong!');

    // var image = new Image();
    // image.src = fileData.previewData.src;
    // var w = window.open("");
    // w.document.write(image.outerHTML);

    // return Promise.resolve();
};

const downloadFile: IFileManagerProps['downloadFile'] = async (fileData) => {
    console.log('downloadFile', fileData);

    // Case 1: get a resource via a direct link.

    // window.open(`api/file/${fileData.fileName}?view=false`, '_blank');
    // OR
    window.open(`api/file/${fileData.fileName}`);
    return Promise.resolve();

    // Case 2: uses the default filename(description) and handles the error if it exists

    // return request(`file/${fileData.fileName}`).then((resp) => resp.blob());

    // OR

    // Case 3: uses the filename from the server and handles the error if it exists

    // return request(`file/${fileData.fileName}`)
    // .then(async resp => {
    //     // let fileName = resp.headers.get('filename'); // get filename from the server
    //     const fileName = resp.headers.get('Content-Disposition').split('filename=')[1].split(';')[0].replace(/['"]/g, '');;
    //     const blob = await resp.blob();
    //     return Promise.resolve({blob, fileName});
    // });

    // OR

    // Case 4: custom implementation

    // if(!fileData?.previewData?.src) return Promise.reject('Something went wrong!');

    // return fetch(fileData.previewData.src) // convert base64 to blob
    // .then(resp => resp.blob())
    // .then(resp => {
    //     const a = document.createElement('a');
    //     document.body.appendChild(a);
    //     const url = window.URL.createObjectURL(resp);
    //     a.href = url;
    //     a.download = 'custom_'+fileData.fileName;
    //     a.click();
    //     document.body.removeChild(a);
    //     setTimeout(() => window.URL.revokeObjectURL(url), 0);

    //     return Promise.resolve();
    // });

    // OR

    // const blob = await fetch(fileData.previewData.src).then(resp => resp.blob());
    // const fileName = 'custom_'+fileData.fileName;

    // // save the file under a new name
    // return Promise.resolve({blob, fileName});
};

const deleteFile: IFileManagerProps['deleteFile'] = (fileData) => {
    console.log('deleteFile', fileData);
    return new Promise((resolve, reject) => {
        fileData.elementRef.current.scrollIntoView({
            behavior: 'auto',
            block: 'center',
        });
        const defBorder = fileData.elementRef.current.style.border;
        fileData.elementRef.current.style.border = '1px solid red';
        fileData.elementRef.current.style.transition = 'none';
        // give some time for animation
        setTimeout(() => {
            if (window.confirm('Are you sure you want to delete this file?')) {
                request(`file/${fileData.uid}`, 'DELETE')
                    .then((response) => response.json())
                    .then((resp) => {
                        if (resp.result) resolve();
                        else reject(resp.error);
                    })
                    .catch((err) => reject(err));
            } else {
                fileData.elementRef.current.style.border = defBorder;
                reject();
            }
        }, 10);
    });
};

const setFileDescription: IFileManagerProps['setFileDescription'] = (fileData) => {
    console.log('setFileDescription', fileData.description);
    return request(`file/${fileData.uid}`, 'PATCH', {
        description: fileData.description,
    }).then((response) => (response.ok && response.text()) || Promise.reject(response.statusText));
    // .catch(err => Promise.reject(err))
};

const onChangeItemMountStates: IFileManagerProps['onChangeItemMountStates'] = (
    changedItems,
    mountedItems,
    unmountedItems
) => {
    console.log('onChangeItemMountStates', changedItems, mountedItems, unmountedItems);
};

const onFilesUploaded: IFileManagerProps['onFilesUploaded'] = (fileData) => {
    console.log('onFileUploaded', fileData, fileData[0].elementRef?.current);
    fileData[0]?.elementRef?.current &&
        fileData[0].elementRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
        });
};

const handleErrors: TOnError = (err) => {
    if (Array.isArray(err)) {
        const messages = err.reduce(
            (acc, val, indx) => acc.concat(`${indx + 1}. ${val.message}\n`),
            ''
        );
        console.error(err);
        alert(messages);
    } else {
        console.error(err);
        alert(err.message);

        // Navigate to the file item element...
        if (Array.isArray(err.data) && err.data[0]?.elementRef?.current) {
            err.data[0].elementRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        if (!Array.isArray(err.data) && err.data?.elementRef?.current) {
            err.data.elementRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
};

export const Manager: FC = (): ReactElement => {
    const [isMounted, setIsMounted] = useState<boolean>();

    const [isLoading, setIsLoading] = useState<boolean>();
    const [isUploading, setIsUploading] = useState<boolean>();

    const [readOnlyMode, setReadOnlyMode] = useState<boolean>();
    const [disabled, setDisabled] = useState<boolean>();

    const ref = useRef<IFileManagerRef>();
    const progressRef = useRef<HTMLDivElement>();

    let root: HTMLElement = null;

    return (
        <div style={{ textAlign: 'center' }}>
            <Typography variant="h5" style={{ padding: 10 }}>
                React File Manager
            </Typography>
            <Paper className="paper">
                <Typography variant="body1" style={{ padding: 10 }}>
                    To test upload cancellation feature, you should slow down your uploading speed
                    by performing network throttling
                </Typography>
                {!isMounted && (
                    <FileManager
                        ref={ref}
                        getRoot={(el) => (root = el)} // Ref callback that gets a DOM reference to the root body element. Can be useful to programmatically scroll.
                        fetchRemoteFiles={fetchRemoteFiles}
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
                        getUploadParams={uploadFileParams}
                        viewFile={viewFile}
                        downloadFile={downloadFile}
                        deleteFile={deleteFile}
                        setFileDescription={setFileDescription}
                        // sortFiles={handleSorting}
                        filePreview={generateFilePreview}
                        // fileValidator={fileValidator}
                        onFilesUploaded={onFilesUploaded}
                        onUploadProgress={(progress, sentBytes, totalBytes) => {
                            console.log('progress', progress, sentBytes, totalBytes);
                            progressRef.current.style.display = !!progress ? 'block' : 'none';
                            progressRef.current.style.width = `${progress ?? 0}%`;
                        }}
                        onLoading={(isLoading, isUploading) => {
                            setIsLoading(isLoading || isUploading);
                            setIsUploading(isUploading);
                        }}
                        onDropFiles={(acceptedFiles, fileRejections) => {
                            console.log('onDropFiles', acceptedFiles, fileRejections);
                        }}
                        onChangeLocalFileStack={(result, changedFiles) => {
                            console.log('onChangeLocalFileStack', result, changedFiles);
                            if (changedFiles[0].elementRef)
                                changedFiles[0].elementRef.current.scrollIntoView({
                                    behavior: 'smooth',
                                    block: 'center',
                                });
                        }}
                        onChangeItemMountStates={onChangeItemMountStates}
                        onError={handleErrors}
                        onUnmountComponent={(root, fileInput) => {
                            console.log('onUnmountComponent', root, fileInput);
                            progressRef.current.style.width = '0%';
                        }}
                        // maxFileCount={6}
                        // maxFileSize={1024*1024*2} // 2 Mb
                        // minFileSize={1024*100} // 100 kB
                        // accept='.png,.jpg,.xlsx'
                        // accept='image/*'
                        uploadFilesInOneRequest={uploadFilesInOneRequest}
                        addFileDescription
                        readOnly={readOnlyMode}
                        disabled={disabled}
                        // preventDropOnDocument={false}
                        //checkFileDuplicates='none'
                        // multiple={false}
                        // autoUpload
                        // noClick
                        // noDrag
                        // noKeyboard
                        // tabIndex={2}
                        overrides={overrides}
                    />
                )}
                <br />
                <div ref={progressRef} className="progress-bar"></div>
                <div>
                    <Button
                        variant="contained"
                        color="primary"
                        style={{ margin: 10 }}
                        onClick={() => ref.current.openFileDialog()}
                        // disabled={isLoading}
                    >
                        Add file(s)
                    </Button>

                    <Button
                        variant="contained"
                        color="secondary"
                        style={{ margin: 10 }}
                        onClick={() => ref.current.removeAllLocalFiles()}
                        // disabled={isLoading}
                    >
                        Remove all files
                    </Button>
                    {!isUploading && (
                        <Button
                            variant="contained"
                            style={{ margin: 10, width: 160 }}
                            onClick={
                                () =>
                                    ref.current.upload(uploadFileParams).then((result) => {
                                        if (result)
                                            console.log(
                                                'The file upload process is completed',
                                                result
                                            );
                                    })
                                // ref.current.upload().then((result) => {
                                //     if (result)
                                //         console.log('The file upload process is completed', result);
                                // })
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
                            style={{ margin: 10, width: 160 }}
                            onClick={() => ref.current.cancelUpload()}
                        >
                            Cancel Upload
                        </Button>
                    )}
                    <Button
                        variant="contained"
                        color={isMounted ? 'primary' : 'secondary'}
                        style={{ margin: 10, width: 160 }}
                        onClick={() => setIsMounted((val) => !val)}
                    >
                        {isMounted ? 'Mount' : 'Unmount'}
                    </Button>

                    <Button
                        variant="contained"
                        color="primary"
                        style={{ margin: 10, width: 200 }}
                        onClick={() => {
                            // ref.current.fetchRemoteFiles(fetchRemoteFiles).then((remoteFiles) => {
                            //     console.log('fetchRemoteFiles', remoteFiles);
                            // });
                            ref.current.fetchRemoteFiles().then((remoteFiles) => {
                                console.log('fetchRemoteFiles', remoteFiles);
                            });
                        }}
                    >
                        Fetch Remote Files
                    </Button>

                    <Paper>
                        <FormControlLabel
                            control={<Checkbox onClick={() => setReadOnlyMode((mode) => !mode)} />}
                            label="Read-Only mode"
                        />
                        <FormControlLabel
                            control={<Checkbox onClick={() => setDisabled((value) => !value)} />}
                            label="Disable File Manager"
                        />
                    </Paper>
                </div>
            </Paper>
        </div>
    );
};
