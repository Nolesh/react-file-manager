![react-file-manager logo](https://raw.githubusercontent.com/nolesh/react-file-manager/master/public/logo.png)

# React File Manager
[![npm (scoped)](https://img.shields.io/npm/v/@nolesh/react-file-manager)](https://www.npmjs.com/package/@nolesh/react-file-manager)
[![GitHub Workflow Status](https://img.shields.io/github/workflow/status/nolesh/react-file-manager/Test)](https://github.com/Nolesh/react-file-manager/actions/workflows/test.yml)
[![Coverage Status](https://coveralls.io/repos/github/Nolesh/react-file-manager/badge.svg)](https://coveralls.io/github/Nolesh/react-file-manager)
[![GitHub](https://img.shields.io/badge/types-included-brightgreen)](/LICENSE)
[![GitHub](https://img.shields.io/github/license/nolesh/react-file-manager)](https://www.npmjs.com/package/@nolesh/react-file-manager)

A simple HTML5 file manager with a drag and drop zone used to cover the most common file operations such as access, edit, delete, upload, download and sort files.

![react file manager demo](https://raw.githubusercontent.com/nolesh/react-file-manager/master/public/ReactFileManager.gif)

## Key Features

- No dependent packages (includes all necessary components like button, menu, etc.).
- Fully customizable.
- Provides preview for all major images, video and audio files.
- Supports uploading multiple files in one request.
- Take control of upload lifecycle.
- Written in TypeScript and has high test coverage.
- Ships with types included.
- All texts and errors in the component can be localized into any supported language.

## TypeScript Support

**React File Manager** supports TypeScript and ships with types in the library itself; no need for any other install.

## Installation

To install `React File Manager`, use the following command:
```sh
# via npm
npm install @nolesh/react-file-manager

# via yarn
yarn add @nolesh/react-file-manager
```
React File Manager has [react](https://reactjs.org/) and [react-dom](https://reactjs.org/docs/react-dom.html) as peer dependencies. React version is  [16.8](https://reactjs.org/blog/2019/02/06/react-v16.8.0.html) or above is required because we use [hooks](https://reactjs.org/docs/hooks-intro.html).

## Usage

You can use this component as a simple file uploader. The following code gives you a sortable dropzone and clickable file input that only accepts image files. It uploads files to `https://httpbin.org/post` and then removes the items that have been uploaded.
```jsx
import React from 'react';
import FileManager from '@nolesh/react-file-manager';
// make sure you include the stylesheet otherwise the file manager will not be styled
import '@nolesh/react-file-manager/dist/styles.css';

const FileUploader = () => (
    <FileManager
        getUploadParams={(files) => ({
            URL: `https://httpbin.org/post`,
            // If the server returns anything other than null,
            // we should return it to remove uploaded file from the list.
            processResponse: () => null,
        })}
        accept='image/*'
    />
);
```
It takes a little more code to set it up as a file manager. In addition to the previous example, this file manager receives two image files from `https://httpbin.org/image` and displays them, has the ability to view, download and delete files. It also handles errors that may occur during file management.
```jsx
import React from 'react';
import FileManager from '@nolesh/react-file-manager';
// make sure you include the stylesheet otherwise the file manager will not be styled
import '@nolesh/react-file-manager/dist/styles.css';

const url = 'https://httpbin.org';

const blobToBase64 = (blob) => (
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  })
)

const fetchFile = (name, type) => (
    fetch(`${url}/image/${type}`)
    .then(res => res.blob())
    .then(async blob => {
        const base64 = await blobToBase64(blob);
        return {
            id: type,
            fileName: `${name}.${type}`,
            fileSize: blob.size,
            previewData: {
                src: base64
            }
        }
    })
)

const viewOrDownloadFile = (fileData) => (
    !!fileData.id
    ? fetch(`${url}/image/${fileData.id}`).then((resp) => resp.blob())
    : Promise.reject(`File (${fileData.fileName}) not found`)
)


const MySimpleFileManager = () => (
    <FileManager
        fetchRemoteFiles={
            () => Promise.all([
                fetchFile('piggy', 'png'),
                fetchFile('wolf','webp')
            ])
        }
        getUploadParams={(files) => ({
            URL: `${url}/post`,
            fields: {
                name: files[0].fileName,
                size: files[0].fileSize,
            },
            processResponse: (res) => {
                // If the server returns anything other than uploaded file data, we should return:
                // Correct file data from response
                return {
                    fileName: res.form.name,
                    fileSize: res.form.size,
                    previewData: {
                        src: res.files.file
                    }
                }
                // Or files passed as function argument to use the internal file data.
                // return files;
            },
            // Retrieves the error message from the server error response
            // Since our error response is an object containing a status and a message,
            // we need to convert it to a string
            processError: error => error.message
        })}
        viewFile={viewOrDownloadFile}
        downloadFile={viewOrDownloadFile}
        // The server doesn't support file deletion, so we simulate it
        deleteFile={(fileData) => (
            new Promise((resolve, reject) => {
                if (window.confirm('Are you sure you want to delete this file?')) {
                    // In real app we should pass the filename or id
                    fetch(`${url}/delete`, {
                        method: 'DELETE'
                    })
                    .then((response) => response.json())
                    .then(() => resolve())
                    .catch((err) => reject(err.message));
                }
                else reject();
            })
        )}
        // We can get several errors, so we combine them and show to the user
        onError={(err) => {
            if (!Array.isArray(err)) alert(err.message);
            else {
                const messages = err.reduce(
                    (acc, val, indx) => acc.concat(`${indx + 1}. ${val.message}\n`),
                    ''
                );
                alert(messages);
            }
        }}
        accept='image/png,image/jpeg'
    />
);
```

**See more live examples [here](https://github.com/nolesh/react-file-manager/tree/master/examples).**


## Props & Methods

|Name|Type|Default Value|Description|
|---|---|---|---|
|accept|`string`|`'*'`|Set accepted file types. Keep in mind that mime type determination is not reliable across platforms. CSV files, for example, are reported as text/plain under macOS but as application/vnd.ms-excel under Windows. This prop must be a valid [MIME type](http://www.iana.org/assignments/media-types/media-types.xhtml) according to [input element specification](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/file) or a valid file extension.|
|multiple|`bool`|`true`|Allow drag 'n' drop (or selection from the file dialog) of multiple files.|
|maxFileCount|`number`|`undefined`|Maximum number of local (accepted) and remote (uploaded) files. The default value is `undefined` which means there is no limitation to how many files are accepted.|
|maxFileSize|`number`|`undefined`|Maximum file size (in bytes)|
|minFileSize|`number`|`0`|Minimum file size (in bytes)|
|disabled|`bool`|`false`|Enable or disable the file manager.|
|readOnly|`bool`|`false`|Set the file manager to read-only mode.|
|noClick|`bool`|`false`|If true, disables click to open the native file selection dialog.|
|noDrag|`bool`|`false`|If true, disables drag 'n' drop.|
|noKeyboard|`bool`|`false`|If true, disables SPACE/ENTER to open the native file selection dialog.|
|autoUpload|`bool`|`false`|If true, automatically uploads files as soon as they are accepted.|
|ignoreFileDuplicates|`union`|`'none'`|Checks local (accepted) and/or remote (uploaded) files for duplicates on acceptance and skips them (throw an error with `file_exists` code) if they exist and the appropriate mode is selected.<br>One of type: `'none', 'local', 'remote', 'all'`.|
|preventDropOnDocument|`bool`|`false`|If false, allow dropped items to take over the current browser window.|
|addFileDescription|`bool`|`false`|Allow the user to add custom description to file.|
|uploadFilesInOneRequest|`bool`|`false`|If true, multiple files will be uploaded in one request.|
|tabIndex|`number`|`0`|Set the `tabindex` attribute on the root component.|
|overrides|`TOverrides`|`null`|Allow to override root and file item components. See [overrides](#overrides) description for more information.|
|getRoot|`(root: HTMLElement) => void`|`null`|Ref callback that gets a DOM reference to the root body element. Can be useful to programmatically scroll.|
|getUploadParams|`TGetUploadParams`|`null`|Set parameters such as `URL`, `headers`, etc. needed for upload files. See [getUploadParams](#getuploadparams) description for more information.|
|fetchRemoteFiles|`() => Promise<IFileData[]>`|`() => Promise.resolve([])`|Fetch remote files from the server. See [fetchRemoteFiles](#fetchremotefiles) description for more information.|
|fileFieldMapping|`(data: any) => IFileData`|`null`|Map the file fields received from the server to the component file fields. This property can be omitted if the component file fields are the same as on the server. See [fileFieldMapping](#filefieldmapping) description for more information.|
|viewFile|`(fileData: IRemoteFileData) => Promise<Blob \| void>`|`null`|View remote file. See [viewFile](#viewfile) description for more information.|
|downloadFile|`(fileData: IRemoteFileData) => Promise<{ blob: Blob; fileName: string } \| Blob \| void>`|`null`|Download remote file. See [downloadFile](#downloadfile) description for more information.|
|deleteFile|`(fileData: IRemoteFileData) => Promise<void>`|`null`|Remove remote file from the server. See [deleteFile](#deletefile) description for more information.|
|setFileDescription|`(fileData: IRemoteFileData) => Promise<string>`|`null`|Set description for remote file. See [setFileDescription](#setfiledescription) description for more information.|
|sortFiles|`TSortFunc`|`null`|Sort local and remote files. See [sortFiles](#sortfiles) description for more information.|
|filePreview|`TFilePreview`|`() => Promise.resolve()`|Allow to add previews for unsupported file types or override the default implementation. See [filePreview](#filepreview) description for more information.|
|fileValidator|`TFileValidator`|`null`|Custom file validation function. See [fileValidator](#filevalidator) description for more information.|
|onFilesUploaded|`(fileData: IRemoteFileData[]) => void`|`null`|Callback for when files have been uploaded.|
|onUploadProgress|`(progress: number, sentBytes: number, totalBytes: number) => void`|`null`|Callback for when files are uploading. Fires every 100ms.|
|onChangeLocalFileStack|`(result: ILocalFileData[], changedFiles: ILocalFileData[]) => void`|`null`|Callback for when any of the local files have been added or removed.|
|onChangeItemMountStates|`(changedItems: IItemMountState[], mountedItems: IItemMountState[], unmountedItems: IItemMountState[]) => void`|`null`|Callback for when any of the file items (local and/or remote) have been mounted or unmounted.|
|onLoading|`(isLoading: boolean, isUploading: boolean) => void`|`null`|Callback for when files are fetching or uploading.|
|onDropFiles|`(acceptedFiles: File[], fileRejections: { file: File; errors: TInternalError[] }[]) => void`|`null`|Callback for when files are accepted or rejected based on the `accept`, `multiple`, `minFileSize` and other props.|
|onError|`TOnError`|`null`|Callback for when an error occurs. See [onError](#onerror) description for more information.|
|onUnmountComponent|`(root: HTMLDivElement, fileInput: HTMLInputElement) => void`|`null`|Callback for when component is unmounted.|

### `overrides`
This property allows the user to override the appearance and text of all components within the file manager, or replace them with custom components. It is also possible to change the implementation of the `uidGenerator` and `fileSizeFormatter` functions, which generate a unique identifier for files and make a human-readable format for the file size, respectively. The `overrides` property is an object with the following structure:

```tsx
{
	uidGenerator?: () => string,
	fileSizeFormatter?: (size: number) => string,
	Root?: {
		hideHeader?: boolean,
		hideFooter?: boolean,
		texts?: {
			headerFileType?: string,
			headerFileName?: string,
			headerFileSize?: string,
			footer?: string,
			dragActiveAccept?: string,
			dragActiveReject?: string,
			loading?: string,
			defaultText?: string,
			defaultTextDisabled?: string
		},
		classNames?: {
		    dropZone?: string,
		    activeAccept?: string,
		    activeReject?: string,
		    header?: string,
		    footer?: string
		},
		styles?: {
			dropZone?: React.CSSProperties,
			header?: React.CSSProperties,
			footer?: React.CSSProperties
		},
		component?: (props: IRootComponentArgs) => React.ReactElement // Replaces default root to custom component
	},
	FileItem?: {
		titles?: {
			menuButtonTitle?: string,
			menuItemView?: string,
			menuItemDownload?: string,
			menuItemRename?: string,
			menuItemDelete?: string,
		},
		rootStyles?: () => {
		    base?: {
                className?: string,
                style?: React.CSSProperties
            },
            initial?: {
                className?: string,
                style?: React.CSSProperties
            },
            uploading?: {
                className?: string,
                style?: React.CSSProperties
            },
            uploaded?: {
                className?: string,
                style?: React.CSSProperties
            },
            editMode?: {
                className?: string,
                style?: React.CSSProperties
            },
            uploadError?: {
                className?: string,
                style?: React.CSSProperties
            },
            deletionError?: {
                className?: string,
                style?: React.CSSProperties
            },
            disabled?: {
                className?: string,
                style?: React.CSSProperties
            }
		},
		thumbnail?: (props: TOverriddenFileItemFuncProps) => React.ReactElement,
		fileName?: (props: TOverriddenFileItemFuncProps) => {
		    readOnlyText?: {
                className?: string,
                style?: React.CSSProperties
            },
            textField?: {
                className?: string,
                style?: React.CSSProperties
            }
		},
		fileSize?: (props: TOverriddenFileItemFuncProps) => {
            className?: string,
            style?: React.CSSProperties
		},
		actionMenu?: (props: TOverriddenFileItemFuncProps) => {
            buttonProps?: {
                title?: string,
                className?: string,
                style?: React.CSSProperties
            },
            buttonChildren?: React.ReactElement,
            displayIcons?: boolean,
            menuStyles?: {
                layer?: React.CSSProperties,
                menu?: React.CSSProperties
            },
            menuItemStyle?: React.CSSProperties,
            menuItemNames?: {
                menuItemView?: string,
                menuItemDownload?: string,
                menuItemRename?: string,
                menuItemDelete?: string
            }
		},
		buttons?: () => {
		    uploadFile?: {
                props?: {
                    style?: React.CSSProperties,
                    className?: string,
                    title?: string
                },
                children?: React.ReactElement
            },
            removeLocalFile?: {
                props?: {
                    style?: React.CSSProperties,
                    className?: string,
                    title?: string
                },
                children?: React.ReactElement
            },
            confirmDescription?: {
                props?: {
                    style?: React.CSSProperties,
                    className?: string,
                    title?: string
                },
                children?: React.ReactElement
            },
            undoDescription?: {
                props?: {
                    style?: React.CSSProperties,
                    className?: string,
                    title?: string
                },
                children?: React.ReactElement
            },
            stub?: React.ReactElement
		},
		progressBar?: (progress: number) => React.ReactElement,
		readOnlyLabel?: () => React.ReactElement,
		component?: (props: IFileItemComponentArgs) => ReactElement, // Replaces default file item to custom component
	}
}
```
All object keys are independent and optional. Using this property, the user can redefine almost any part of the `File Manager`. For more information, see examples ([Custom UI](https://github.com/Nolesh/react-file-manager/demo/CustomUI), [Overridden UI](https://github.com/Nolesh/react-file-manager/demo/OverriddenUI)).

### `getUploadParams`
This function should return an object or promise with the parameters required to upload files:

```tsx
(localFileData: ILocalFileData | ILocalFileData[]) => ({
  URL: string, // URL to the server (required)
  fileFieldName?: string, // the name of the key in the FormData to which the file is assigned. Default value: 'file'
  fields?: object, // additional fields in the FormData
  body?: BodyInit, // request body that can be used instead of FormData
  headers?: object,
  method?: string, // default value: 'POST'
  timeout?: number, // default value: 0
  processResponse?: (response: any) => any, // intermediate function for processing the received result
  checkResult?: (result: any) => boolean, // if the function returns false, the file manager will throw an error
  processError?: (error: any) => string // convert the error received from the server to a string
})
```
There are some aspects to consider when using `getUploadParams`:
- The `localFileData` argument can be either a single file data or an array of file data. It depends on the `uploadFilesInOneRequest` property, which is set to `false` by default, meaning that the `localFileData` is a single file data. On the other hand, if you use mode of uploading files in one request (`uploadFilesInOneRequest=true`), the `localFileData` will be an array of file data.
- If the `uploadFilesInOneRequest` property is set to `true`, all local (accepted) files will be wrapped in FormData and sent in a single request. Accordingly, all necessary data, such as file descriptions, must be attached to this request and further processed on the server. You can pass the data of files as an array using an additional field in FormData or using headers as shown below:
    ```tsx
    (localFileData: ILocalFileData | ILocalFileData[]) => ({
    ...
    headers: {
    	attachments: JSON.stringify(
    		localFileData.map((fileData) => ({
    			fileId: fileData.uid,
    			description: encodeURIComponent(fileData.description)
    		}))
    	),
    },
    // OR
    fields: {
    	fileIds: JSON.stringify(localFileData.map(f => f.uid)),
    	descriptions: JSON.stringify(localFileData.map(f => f.description))
    },
    ```
- `processResponse` is an intermediate function for processing the result received from the server after uploading file(s). If the server returns `null` or data that can be correctly mapped by the `fileFieldMapping` property, `processResponse` can be omitted. Otherwise it should return one of the following:
    - proper file data created from the server response, which must be correctly mapped by the `fileFieldMapping` or contain required fields (`fileName`, `fileSize`).
    - `localFileData` passed as an argument to the `getUploadParams` function in order to use the internal file data.
    - `null` to remove uploaded file(s) from the list.
- `checkResult` is an optional function that checks the result received from the server to make sure the file was loaded correctly. If it is defined and returns `false`, the file manager will throw an error even if the file was successfully uploaded.
- `processError` is a function to process an error that may be thrown by the server during a file upload. It should extract and return the text from the error for the message that will be displayed to the user in the `onError` property.
- When the `addFileDescription` property is set to `true`, the user has the ability to attach a description to the uploaded file. Depending on the server implementation, you can use `headers` or `fields` to send this description and other data along with the file:
    ```tsx
    (localFileData: ILocalFileData | ILocalFileData[]) => ({
    ...
    headers: {
        attachment: JSON.stringify({
            fileId: localFileData.uid,
            description: encodeURIComponent(localFileData.description)
        }),
    },
    // OR
    fields: {
        fileId: localFileData.uid,
        description: localFileData.description
    },
    ```
- In some situations, you may need to use the `body` property instead of `FormData`. For example, uploading a file to S3 using PUT. Basically, if you use PUT, you can't wrap your file in a `FormData` instance. In this case, `body` must be set to file:
    ```tsx
    body: localFileData.file,
    method: 'PUT',
    ```
- It is also possible to pass a promise to the `getUploadParams` function if you want to perform preliminary actions, such as asynchronously obtaining an access token:
    ```tsx
    getUploadParams={async (localFileData) => {                            
        return {
            URL: '/api/uploadFile',
            headers: {
                Authorization: await getAccessToken()
            }
        }
    }}   
    ```

### `fetchRemoteFiles`
This property is a function for getting uploaded (remote) files from the server. By default it returns `Promise.resolve([])`.
Basic example:
```tsx
fetchRemoteFiles={
    () => (
        fetch(`/api/fetchFiles`)
        .then(res => res.json())
        .catch(e => Promise.resolve([]))
    )
}
```

### `fileFieldMapping`
This function maps the server response to the fields of the component file item. If this property is NOT defined and the server response does NOT contain required fields such as `fileName` and `fileSize`, the component will throw a specific error. It can be omitted if the field mapping is implemented in the `fetchRemoteFiles` and `processResponse`. In a real application, the server should send a response with the same structure when fetching and after uploading files. So you can use this property to map the server response in both cases instead of doing this individually in the `fetchRemoteFiles` and `processResponse`. It can also be used to extend file data with additional fields.
```tsx
fileFieldMapping={(data) => ({
    uid: data.file_id, // optional
    fileName: data.file_name, // required!
    fileSize: data.file_size, // required!
    fileType: data.file_type, // optional
    description: data.desc, // optional
    previewData: { // optional
        src: data.thumbnail, // optional
    },
    readOnly: data.read_only, // optional
    disabled: !data.enabled, // optional
    myCustomField: data.my_custom_field, // you can add extra fields to the file data
})}
```
**IMPORTANT**:
- `fileName` and `fileSize` fields are `mandatory`.
- In addition to the above fields, the `File Manager` can add extra fields, such as, for example, `elementRef`, needed to navigate to a file element, and others for internal use. So make sure the following keys are NOT overlapped:
    - file
    - state
    - oldDescription
    - editMode
    - elementRef
    - cancelUpload
    - uploadedSize
    - totalSize
    - shouldBeRemoved

### `viewFile`
This property should provide file browsing implementation. It must return a promise that resolves with a `blob`, or an empty promise in the case of a custom implementation.
Example of requesting a `blob` from the server and handling errors if they exist:
```tsx
viewFile={(fileData) => (
    fetch(`/api/file/${fileData.fileName}`)
    .then((resp) => resp.blob())
)}
```
Custom implementation example:
```tsx
viewFile={(fileData) => (
    if(!fileData?.previewData?.src) return Promise.reject('Something went wrong!');

    var image = new Image();
    image.src = fileData.previewData.src;
    var w = window.open("");
    w.document.write(image.outerHTML);

    return Promise.resolve();
)}
```

### `downloadFile`
This property should provide file downloading implementation. It must return a promise that resolves with a `blob` or an object that contains `blob` and `fileName`, or an empty promise in the case of a custom implementation.
Example of requesting a `blob` from the server and handling errors if they exist:
```tsx
downloadFile={(fileData) => (
    fetch(`/api/file/${fileData.fileName}`)
    .then((resp) => resp.blob())
)}
```
Custom implementation example:
```tsx
downloadFile={async (fileData) => {
    if(!fileData?.previewData?.src) return Promise.reject('Something went wrong!');

    // convert base64 to blob
    const blob = await fetch(fileData.previewData.src).then(resp => resp.blob());
    const fileName = 'custom_'+fileData.fileName;

    // save the file under a new name
    return Promise.resolve({blob, fileName});
}}
```

### `deleteFile`
This property should provide an implementation for deleting files. It is required to return a resolved promise to confirm file deletion. To cancel the deletion of a file, the user need to return an empty promise rejection:
```tsx
deleteFile={(fileData) => {
    return new Promise((resolve, reject) => {
        // to give the menu time to disappear, we put the 'window.confirm' inside 'setTimeout'
        setTimeout(() => {
            if (window.confirm('Are you sure you want to delete this file?')) {
                fetch(`/api/file/${fileData.uid}`, {
                    method: 'DELETE'
                })
                .then((response) => response.json())
                .then((resp) => {
                    if (resp.result) resolve(); // confirm file deletion
                    else reject(resp.error); // cancel file deletion in case of an error
                })
                .catch((err) => reject(err)); // cancel file deletion in case of an error
            }
            else reject(); // cancel the deletion of the file if the user clicks the "Cancel" button
        }, 10);
    });
}}
```

### `setFileDescription`
This property should provide an implementation for setting the file description. Do not confuse this property with the `addFileDescription`. The `setFileDescription` sends a request to the server to set a description for an already uploaded file, whereas `addFileDescription` makes the ability to attach a description to a file at upload time.
Basic example:
```tsx
setFileDescription={(fileData) => {
    return fetch(`/api/file/${fileData.uid}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({description: fileData.description})
    })
    .then((response) => (
        response.ok ? response.text() : Promise.reject(response.statusText)
    ))
}}
```
Note that this function returns some text from the server. This text will be set as the file description in the component.

### `sortFiles`
This property should provide an implementation for sorting files. The following example sorts files by their types (local files come first) and size:
```tsx
sortFiles={(a, b) => {
    // sort by file type (local or remote)
    const fileTypeResult = a.isLocalFile === b.isLocalFile ? 0 : a.isLocalFile ? -1 : 1;
    // sort by file size
    const fileSizeResult = a.fileData.fileSize - b.fileData.fileSize;
    return fileTypeResult || fileSizeResult;
}}
```
Note that this property overrides the default sort function implemented in the root component.

### `filePreview`
This property allows the user to add previews for unsupported file types or override the default implementation. The default value is `() => Promise.resolve()` which means use the default implementation. Note that `filePreview` is for `local` files only. Preview creation for uploaded (remote) files should be implemented on the server side.
The following example adds an implementation for files of type `PDF`:
```tsx
// We are using the 'PDFJS' library to generate the thumbnail of the PDF file.
// Feel free to use any other library for this purpose.
const PDFJS = require('pdfjs-dist/webpack');
...
filePreview={(file) => {
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
                        viewport.height || viewport.viewBox[3];
                    canvas.width =
                        viewport.width || viewport.viewBox[2];
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

    // Return a promise that resolves with a 'null' or 'undefined' to use the default implementation for the rest file types
    return Promise.resolve();
}}
```
You can also override the default implementation for `image`, `audio`, and `video` file types:
```tsx
filePreview={(file) => {
    // Overrides default implementation for images
    if(file.type.startsWith('image/')){
      const imageUrl = URL.createObjectURL(file);
      return Promise.resolve(imageUrl);
    }
    // Prevent the default implementation if the file type is audio (ignore audio files)
    else if (file.type.startsWith('audio/')) {
        return Promise.reject();
    }

    // Prevent the default implementation for the rest file types (video)
    return Promise.reject();
}}
```

### `fileValidator`
Custom file validation function. It should return a single error, or an array of errors if the check fails. If validation succeeds, return `null`.
The error should be an object with the following structure:
```tsx
{
    errorId: 'user-error-id',
    message: `human readable error message`,
    data: {} // additional data attached to the error
}
```
The following example checks the length of a file name:
```tsx
fileValidator={(file, localFiles, remoteFiles) => {
    const maxLength = 20; // file name is larger than 20 symbols
    if(file.name.length > maxLength) {
        return {
            errorId: 'name-too-large',
            message: `Name is larger than ${maxLength} characters`, // required
            data: { file, maxLength }
        };
    }
    return null;
}}
```
Note that if you do NOT set the `errorId` key, it will be set to the default value `validation_error`.

### `onError`
Callback for when an error occurs. It may receive a single error or an array of errors as an argument. In case of multiple errors, you can collect all errors and show them to the user in one message:
```tsx
onError={(err) => {
    if (Array.isArray(err)) {
        const messages = err.reduce(
            (acc, val, indx) => acc.concat(`${indx + 1}. ${val.message}\n`),
            ''
        );
        alert(messages);
    }
}}
```
Since the error has fields such as `errorId` and `data`, you can ignore or override certain types of errors or extend the message with extra information:
```tsx
onError={(err) => {
    const processError = e => {
        if(e.errorId === 'invalid_size_min') { // override default message
            return `file size is too small (${e.data.fileSize})`
        }
        else if(e.errorId === 'invalid_size_max') return null; // ignore error
        else return e.message; // return default message
    }

    let message = [];

    if (Array.isArray(err)) {
        message = err.map(e => processError(e)).filter(e => e);
    }
    else message.push(processError(err));

    if(message.length) alert(message.join('\n'));
}}
```
Full list of internal error codes:
|Code|Description|
|---|---|
|upload_aborted|Occurs when the user aborts a file uploading.|
|upload_timeout|Occurs when a file uploading is interrupted due to a timeout.|
|upload_wrong_result|Occurs when the response from the server fails the check in the "checkResult" function.|
|upload_error|Occurs when a file uploading is interrupted due to a lost connection or a server-side error.|
|delete_error|Occurs when the `deleteFile` function returns a promise rejection with an error, represented as a string.|
|download_error|Occurs when the `downloadFile` function returns a promise rejection.|
|view_error|Occurs when the `viewFile` function returns a promise rejection.|
|rename_error|Occurs when the `setFileDescription` function returns a promise rejection.|
|multiple_not_allowed|Occurs when the user tries to add multiple files at once while the `multiple` property is set to `false`.|
|exceed_max_file_count|Occurs when the user tries to add more files than specified in the `maxFileCount` property.|
|invalid_size_max|Occurs when the user tries to add a file that is larger than the value specified in the `maxFileSize` property.|
|invalid_size_min|Occurs when the user tries to add a file that is smaller than the value specified in the `minFileSize` property.|
|invalid_type|Occurs when the user tries to add a file whose type is NOT specified in the `accept` property.|
|file_exists|Occurs when the user tries to add a file that already exist. The occurrence of this error depends on the `ignoreFileDuplicates` property. For example, if the user adds a file that is already uploaded and `ignoreFileDuplicates` is set to `remote`, an error occurs. If you set `ignoreFileDuplicates` to `all`, this error will be ignored.|
|validation_error|This error is related to the `fileValidator` function. This function should return an error (or an array of errors), if file validation fails. The default code of this error is `validation_error`.|
|unexpected_error|This error code is currently unused and left for possible future use.|

## Ref

You can use the `ref` exposed by the `ReactFileManager` component to perform some actions programmatically, such as opening a file dialog.
```jsx
import React, {useRef} from 'react';
import FileManager from '@nolesh/react-file-manager';
// make sure you include the stylesheet otherwise the file manager will not be styled
import '@nolesh/react-file-manager/dist/styles.css';

const FileUploader = () => {

    const fileManagerRef = useRef();

    const openDialog = () => {
      // Note that the ref is set async, so it might be null at some point
      if (fileManagerRef.current) {
        fileManagerRef.current.openFileDialog()
      }
    };

    return (
        <div style={{ textAlign:'center' }}>
            <FileManager
                ref={fileManagerRef}
                getUploadParams={(files) => ({
                    URL: `https://httpbin.org/post`,
                    // If the server returns anything other than null,
                    // we should return it to remove uploaded file from the list.
                    processResponse: () => null,
                })}
                accept='image/*'
            />
            <br/>
            <button onClick={openDialog}>Add File(s)s</button>
        </div>
    )
}
```
List of props and methods available by `ref`:
|Name|Type|Description|
|---|---|---|
|openFileDialog|`() => void`|Allow the user to open a file dialog programmatically.|
|addLocalFiles|`(files: File \| File[]) => void`|Add local files to the component. Can be useful when adding files from the clipboard.|
|removeAllLocalFiles|`() => void`|Remove all local files from the component.|
|update|`() => void`|Force update the component.|
|upload|`() => Promise<any>`|Initiate uploading of all local files.|
|cancelUpload|`() => void`|Cancel uploading of all files.|
|reloadRemoteFiles|`() => Promise<IRemoteFileData[]>`|Initiate fetching of remote files. Calls the `fetchRemoteFiles` function.|
|remoteFiles|`IRemoteFileData[]`|A list of remote files displayed in the component.|
|localFiles|`ILocalFileData[]`|A list of local (accepted) files displayed in the component.|

## Contribute

If you like to improve React File Manager fork the repo and get started by running the following:

```bash
$ git clone https://github.com/nolesh/react-file-manager.git react-file-manager
$ cd react-file-manager
$ npm install
$ npm run dev
```

To run the demo use the following command:
```bash
$ npm run demo
```

Check http://0.0.0.0:3000/ in your browser and have fun!


## License
[MIT licensed](/LICENSE).
