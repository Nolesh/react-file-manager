import React from 'react';

import '@testing-library/jest-dom';
import { act, render, fireEvent, waitFor, screen, within } from '@testing-library/react';

import {
    FileItemComponent,
    IFileItemProps,
    IItemRef,
    IItemMountState,
    ILocalFileData,
    TFileItemState,
    IOverriddenFileItem,
    IFileItemComponentProps,
    TProgressBarComponent,
    TControlFieldComponent,
    TInputFieldComponent,
    TSizeFieldComponent,
    TThumbnailFieldStyles,
    TThumbnailFieldComponent,
} from '../src/lib/FileItemComponent';

import DefaultFileItemRenderer, { fileActions } from '../src/lib/DefaultFileItemRenderer';

import { formatSize } from '../src/lib/Utils';

import { mockFile } from './MockData';
import { SameType } from '../src/lib/Utils/types';
import { IRemoteFileData } from '../src/lib';
import { debug } from 'webpack';

let elementRef: React.RefObject<HTMLDivElement>;
let itemRefs: React.RefObject<IItemRef[]>;
let itemMountStates: React.RefObject<IItemMountState[]>;

const uploadFile = jest.fn();
const deleteFile = jest.fn();
const downloadFile = jest.fn();
const viewFile = jest.fn();
const renameFileDescriptionSuccess = jest.fn(
    (fileData: ILocalFileData) =>
        new Promise<string>((resolve) => {
            resolve('test desc');
        })
);
const renameFileDescriptionFail = jest.fn(
    (fileData: ILocalFileData) =>
        new Promise<string>((_, reject) => {
            reject('test error');
        })
);

type TUpdateFileData = (
    input: Partial<IRemoteFileData> | ((item: IRemoteFileData) => IRemoteFileData),
    uid: string
) => void;
const updateFileData = jest.fn((item, uid) => {
    // console.log(uid)
});
const throwError = jest.fn();

const cancelUpload = jest.fn();

const defaultFileData: ILocalFileData = {
    uid: 'file-uid-123',
    file: null,
    fileName: 'test-file',
    fileType: 'txt',
    fileSize: 2 * 1024,
    totalSize: 2 * 1024,

    elementRef,
    cancelUpload,

    uploadedSize: 0,
    state: 'local',
};

const Component = (props: {
    fileDataProps?: {
        file?: File;
        fileType?: string;
        state?: TFileItemState;
        uploadedSize?: number;
        description?: string;
        oldDescription?: string;
        editMode?: boolean;
        readOnly?: boolean;
        disabled?: boolean;
        previewData?: ILocalFileData['previewData'];
        cancelUpload?: ILocalFileData['cancelUpload'];
    };
    fileItemProps?: Partial<
        SameType<boolean, 'isDragActive' | 'isLocalFile' | 'noKeyboard' | 'readOnly' | 'disabled'>
    > & {
        overrides?: IOverriddenFileItem;
        setFileDescription?: IFileItemProps['setFileDescription'];
        [x: string]: any;
    };
}) => {
    elementRef = React.useRef();
    itemRefs = React.useRef([]);
    itemMountStates = React.useRef([]);

    const root = document.body.querySelector('div');
    // console.log('root', root);

    const fileData: ILocalFileData = {
        ...defaultFileData,
        ...props.fileDataProps,
    };

    const overrides = props.fileItemProps?.overrides;

    const args: IFileItemProps = {
        itemRefs,
        itemMountStates,
        root,
        uploadFile,
        deleteFile,
        downloadFile,
        viewFile,
        updateFileData,
        throwError,

        formatSize,
        fileData,
        showProgress: true,
        disabled: false,
        isDragActive: false,
        isLocalFile: true,
        noKeyboard: false,
        // overrides: null,
        readOnly: false,
        component:
            overrides?.component ||
            ((props: IFileItemComponentProps) => (
                <DefaultFileItemRenderer {...props} {...{ overrides: overrides }} />
            )),
        ...props.fileItemProps,
    };

    return <FileItemComponent {...args} />;
};

describe('FileItemComponent', () => {
    test('should call "updateFileData" function when focusing and blurring the textbox and the file item is in "local" state', async () => {
        const { getByRole } = render(<Component />);

        const textbox = getByRole('textbox');

        fireEvent.focus(textbox);
        expect(updateFileData).toBeCalledTimes(1);

        fireEvent.blur(textbox);
        expect(updateFileData).toBeCalledTimes(2);
    });

    test('should call various events', async () => {
        const { rerender, getAllByRole, getByRole } = render(<Component />);

        let buttons = getAllByRole('button');

        // click on the upload button
        fireEvent.click(buttons[0]);
        expect(uploadFile).toBeCalledTimes(1);

        // click on the delete button
        fireEvent.click(buttons[1]);
        expect(deleteFile).toBeCalledTimes(1);

        // click on the cancel upload button
        rerender(<Component fileDataProps={{ state: 'uploading' }} />);
        fireEvent.click(getByRole('button'));
        expect(cancelUpload).toBeCalledTimes(1);

        rerender(<Component fileDataProps={{ state: 'uploaded' }} />);

        // open menu & click on view item
        fireEvent.click(getByRole('button'));
        let menuItems = getAllByRole('menuitem');
        expect(menuItems.length).toEqual(3); // the number of menu items must be 3
        fireEvent.click(menuItems[0]);
        expect(viewFile).toBeCalledTimes(1);

        // open menu & click on download item
        fireEvent.click(getByRole('button'));
        menuItems = getAllByRole('menuitem');
        fireEvent.click(menuItems[1]);
        expect(downloadFile).toBeCalledTimes(1);

        // open menu & click on delete item
        fireEvent.click(getByRole('button'));
        menuItems = getAllByRole('menuitem');
        fireEvent.click(menuItems[2]);
        expect(deleteFile).toBeCalledTimes(2);

        // pass setFileDescription that returns successful result
        rerender(
            <Component
                fileDataProps={{ state: 'uploaded' }}
                fileItemProps={{ setFileDescription: renameFileDescriptionSuccess }}
            />
        );

        // open menu & click on rename item
        fireEvent.click(getByRole('button'));
        menuItems = getAllByRole('menuitem');
        expect(menuItems.length).toEqual(4); // the number of menu items must be 4
        fireEvent.click(menuItems[2]);
        expect(updateFileData).toBeCalledTimes(1);

        // set edit mode (should be set when we click on rename menu item)
        rerender(
            <Component
                fileDataProps={{ state: 'uploaded', editMode: true }}
                fileItemProps={{ setFileDescription: renameFileDescriptionSuccess }}
            />
        );

        buttons = getAllByRole('button');
        // click on cancel button
        fireEvent.click(buttons[1]);
        expect(updateFileData).toBeCalledTimes(2);

        // click on confirm button
        fireEvent.click(buttons[0]);
        expect(renameFileDescriptionSuccess).toBeCalledTimes(1);
        await waitFor(() => expect(updateFileData).toBeCalledTimes(3));

        // set 'setFileDescription' function that cannot be executed
        rerender(
            <Component
                fileDataProps={{ state: 'uploaded', editMode: true }}
                fileItemProps={{ setFileDescription: renameFileDescriptionFail }}
            />
        );

        fireEvent.click(buttons[0]);
        expect(renameFileDescriptionFail).toBeCalledTimes(1);
        await waitFor(() => {
            expect(updateFileData).toBeCalledTimes(4); // undoDescriptionChanges
            expect(throwError).toBeCalledTimes(1);
        });
    });

    test('should confirm or discard description changes when textbox has focus and the user presses the "Esc" or "Enter" key', () => {
        const { rerender, getAllByRole, getByRole } = render(
            <Component
                fileDataProps={{ state: 'uploaded', editMode: true }}
                fileItemProps={{ setFileDescription: renameFileDescriptionSuccess }}
            />
        );

        const textbox = getByRole('textbox');
        textbox.focus();

        expect(textbox).toHaveFocus();

        fireEvent.keyUp(textbox, { key: 'Escape' });
        expect(updateFileData).toBeCalledTimes(1);

        fireEvent.keyUp(textbox, { key: 'Enter' });
        expect(renameFileDescriptionSuccess).toBeCalledTimes(1);
    });

    test('should test updateFileData function on changeDescription', () => {
        const newValue = 'new value';

        const updateFileData: TUpdateFileData = (item, uid) => {
            expect((item as IRemoteFileData).description).toBe(newValue);
        };

        const { getByRole } = render(
            <Component
                fileDataProps={{
                    state: 'uploaded',
                    editMode: true,
                }}
                fileItemProps={{
                    updateFileData,
                }}
            />
        );

        const textbox = getByRole('textbox');

        fireEvent.change(textbox, {
            target: { value: newValue },
        });

        expect(textbox).toHaveValue(newValue);
    });

    test('should test updateFileData function on changeDescriptionMode', async () => {
        const updateFileData: TUpdateFileData = (update, uid) => {
            type TItem = Partial<IRemoteFileData>;
            const expectedResult: TItem = {
                editMode: true,
                description: 'file.txt',
                fileName: 'file.txt',
            };

            const item: TItem = {
                editMode: false,
                description: '',
                fileName: 'file.txt',
            };

            const result = (update as (item: any) => IRemoteFileData)(item);

            expect(result).toEqual(expectedResult);
            expect(item).toEqual(expectedResult);
        };

        const { getAllByRole, getByRole } = render(
            <Component
                fileDataProps={{ state: 'uploaded' }}
                fileItemProps={{
                    updateFileData,
                    setFileDescription: renameFileDescriptionSuccess,
                }}
            />
        );

        // open menu & click on rename item
        fireEvent.click(getByRole('button'));
        const menuItems = getAllByRole('menuitem');
        fireEvent.click(menuItems[2]);
    });

    test('should set focus on the textbox when the user press the "rename" button', () => {
        jest.useFakeTimers();

        const { rerender, getAllByRole, getByRole } = render(
            <Component
                fileDataProps={{ state: 'uploaded' }}
                fileItemProps={{ setFileDescription: renameFileDescriptionSuccess }}
            />
        );

        // open menu & click on rename item
        fireEvent.click(getByRole('button'));
        const menuItems = getAllByRole('menuitem');
        fireEvent.click(menuItems[2]);

        rerender(
            <Component
                fileDataProps={{ state: 'uploaded', editMode: true }}
                fileItemProps={{ setFileDescription: renameFileDescriptionSuccess }}
            />
        );

        const textbox = getByRole('textbox');
        const setFocus = jest.spyOn(HTMLInputElement.prototype, 'focus');
        // setFocus.mockImplementation(() => { console.log('focus') })

        jest.runAllTimers();

        expect(setFocus).toBeCalledTimes(1);
        expect(textbox).toHaveFocus();
    });

    test('should test updateFileData function on undoDescriptionChanges', async () => {
        const oldDescription = 'old desc';

        const updateFileData: TUpdateFileData = (item, uid) => {
            type TItem = Partial<IRemoteFileData>;

            const expectedResult: TItem = {
                editMode: false,
                description: oldDescription,
            };

            expect(item).toEqual(expectedResult);
        };

        const { getByTitle } = render(
            <Component
                fileDataProps={{
                    state: 'uploaded',
                    editMode: true,
                    description: 'new desc',
                    oldDescription,
                }}
                fileItemProps={{
                    updateFileData,
                    setFileDescription: renameFileDescriptionSuccess,
                }}
            />
        );

        getByTitle('Cancel').click();
    });

    test('should test updateFileData function on confirmDescriptionChanges', async () => {
        const desc = 'test desc';

        const updateFileData: TUpdateFileData = (update, uid) => {
            type TItem = Partial<IRemoteFileData>;

            const expectedResult: TItem = {
                editMode: false,
                description: desc,
                oldDescription: desc,
                fileName: 'file.txt',
            };

            const item: TItem = {
                fileName: 'file.txt',
            };

            const result = (update as (item: any) => IRemoteFileData)(item);

            expect(result).toEqual(expectedResult);
            expect(item).toEqual(expectedResult);
        };

        const { getByTitle } = render(
            <Component
                fileDataProps={{
                    state: 'uploaded',
                    editMode: true,
                }}
                fileItemProps={{
                    updateFileData,
                    setFileDescription: renameFileDescriptionSuccess,
                }}
            />
        );

        getByTitle('Confirm').click();
    });

    test('should test updateFileData function on focus and blur', async () => {
        type TItem = Partial<IRemoteFileData>;

        const updateFileData = jest
            .fn()
            .mockImplementationOnce((item: TItem) => {
                expect(item).toEqual({ editMode: true });
            })
            .mockImplementationOnce((item: TItem) => {
                expect(item).toEqual({ editMode: false });
            });

        const { getByRole } = render(
            <Component
                fileItemProps={{
                    updateFileData,
                }}
            />
        );

        const textbox = getByRole('textbox');
        textbox.focus();

        textbox.blur();
    });
});

describe('DefaultFileItemRenderer', () => {
    test('should render the file item in local state', () => {
        const { getByRole } = render(<Component />);
        expect(getByRole('fileitem')).toHaveAttribute('id', 'file-uid-123');
        expect(within(getByRole('thumbnail')).getByText('txt')).not.toBeNull();
        expect(getByRole('textbox')).toBeInTheDocument();
        expect(within(getByRole('filesize')).getByText('2.0 kB')).not.toBeNull();
        expect(within(getByRole('control')).queryAllByRole('button')).toHaveLength(2);
    });

    test('should test classNames & item styles depending on state', () => {
        const { rerender, getByRole, getAllByRole } = render(<Component />);
        expect(getByRole('fileitem')).toHaveClass('display-item display-item-local');

        const check = (props: Parameters<typeof Component>[0], className: string) => {
            rerender(<Component {...props} />);
            expect(getByRole('fileitem')).toHaveClass('display-item ' + className);
        };

        // disabled state
        check(
            { fileDataProps: { state: 'uploaded' }, fileItemProps: { disabled: true } },
            'display-item-uploaded-disabled'
        );
        check(
            { fileDataProps: { state: 'deletionError' }, fileItemProps: { disabled: true } },
            'display-item-uploaded-disabled'
        );
        check(
            { fileDataProps: { state: 'uploaded', disabled: true } },
            'display-item-uploaded-disabled'
        );
        check(
            { fileDataProps: { state: 'deletionError', disabled: true } },
            'display-item-uploaded-disabled'
        );
        check({ fileDataProps: { state: 'uploading', disabled: true } }, 'display-item-uploading');
        check(
            { fileDataProps: { state: 'uploading' }, fileItemProps: { disabled: true } },
            'display-item-uploading'
        );

        check(
            { fileDataProps: { state: 'local' }, fileItemProps: { disabled: true } },
            'display-item-local-disabled'
        );
        check({ fileDataProps: { state: 'local', disabled: true } }, 'display-item-local-disabled');
        check(
            { fileDataProps: { state: 'uploadError' }, fileItemProps: { disabled: true } },
            'display-item-local-disabled'
        );
        check(
            { fileDataProps: { state: 'uploadError', disabled: true } },
            'display-item-local-disabled'
        );

        // // edit mode
        check({ fileDataProps: { editMode: true, state: 'local' } }, 'display-item-local');
        check({ fileDataProps: { editMode: true, state: 'uploaded' } }, 'display-item-edit-mode');

        // rest states
        check({ fileDataProps: { state: 'deletionError' } }, 'display-item-del-error');
        check({ fileDataProps: { state: 'uploadError' } }, 'display-item-upload-error');
        check({ fileDataProps: { state: 'uploaded' } }, 'display-item-uploaded');
        check({ fileDataProps: { state: 'uploading' } }, 'display-item-uploading');
    });

    test('should disable buttons based on "disabled" or "readonly" params', () => {
        const checkBtn = (disabled = true) => {
            for (const btn of getAllByRole('button')) {
                if (disabled) expect(btn).toHaveAttribute('disabled');
                else expect(btn).not.toHaveAttribute('disabled');
            }
        };

        const check = (props: Parameters<typeof Component>[0], disabled = true) => {
            rerender(<Component {...props} />);
            checkBtn(disabled);
        };

        const { rerender, getAllByRole } = render(<Component />);
        checkBtn(false);

        check({ fileDataProps: { readOnly: true } });
        check({ fileDataProps: { disabled: true } });
        check({ fileItemProps: { disabled: true } });
        check({ fileItemProps: { readOnly: true } });
    });

    test('should test fileActions', () => {
        // const defaultParams: IMenuItem = {
        const defaultParams: Parameters<typeof fileActions>[0] = {
            fileData: null,
            deleteFile: null,
            downloadFile: null,
            viewFile: null,
            changeDescriptionMode: null,
            displayIcons: false,
            itemNames: {
                menuItemDelete: 'miDelete',
                menuItemDownload: 'miDownload',
                menuItemRename: 'miRename',
                menuItemView: 'miView',
            },
        };

        let result = fileActions(defaultParams);
        expect(result).toEqual([]);

        result = fileActions({
            ...defaultParams,
            ...{
                viewFile: () => undefined,
                changeDescriptionMode: () => undefined,
                downloadFile: () => undefined,
                deleteFile: () => undefined,
            },
        });

        expect(result.length).toEqual(4);
        for (const item of result) {
            expect(item.icon).toBeFalsy();
            expect(item.action).not.toBeNull();
        }

        expect(result[0].name).toEqual('miView');
        expect(result[1].name).toEqual('miDownload');
        expect(result[2].name).toEqual('miRename');
        expect(result[3].name).toEqual('miDelete');

        let fileData: ILocalFileData = null;
        result = fileActions({
            ...defaultParams,
            ...{
                viewFile: jest.fn((data) => {
                    fileData = data;
                }),
                displayIcons: true,
                fileData: defaultFileData,
            },
        });

        expect(result.length).toEqual(1);
        expect(result[0].icon).toBeTruthy();
        result[0].action();
        expect(fileData).toEqual(defaultFileData);
    });

    test('should test default thumbnail', () => {
        let file = mockFile();

        const { rerender, getAllByRole, getByRole, getByTestId } = render(<Component />);

        // should render only file type
        expect(within(getByRole('thumbnail')).getByText('txt')).toBeInTheDocument();

        // should render progress bar
        rerender(
            <Component fileDataProps={{ file, previewData: { src: null }, fileType: 'jpeg' }} />
        );
        expect(within(getByRole('thumbnail')).getByText('jpeg')).toBeInTheDocument();
        expect(within(getByRole('thumbnail')).getByTestId('loading-icon')).toBeInTheDocument();

        // should render audio thumbnail
        file = mockFile(undefined, undefined, 'audio/mpeg');
        rerender(
            <Component
                fileDataProps={{
                    file,
                    previewData: { src: 'data:audio/wav;base64,', duration: 12 },
                    fileType: 'mpeg',
                }}
            />
        );
        expect(within(getByRole('thumbnail')).getByRole('button')).toBeInTheDocument();
        expect(within(getByRole('thumbnail')).getByRole('audio')).toBeInTheDocument();

        // should render ImageLazyLoader
        rerender(
            <Component
                fileDataProps={{ previewData: { src: 'data:image/png;base64,' }, fileType: 'png' }}
            />
        );
        expect(within(getByRole('thumbnail')).getByRole('imagelazyloader')).toBeInTheDocument();

        // should NOT render ImageLazyLoader
        rerender(
            <Component fileDataProps={{ previewData: { src: 'blob://file' }, fileType: 'png' }} />
        );
        expect(within(getByRole('thumbnail')).queryByRole('imagelazyloader')).toBeNull();

        // set IntersectionObserver to undefined to invoke intersection callback
        const observer = window.IntersectionObserver;
        window.IntersectionObserver = undefined;
        jest.spyOn(console, 'info').mockImplementation(() => undefined);

        // simulate loading video thumbnail with its duration
        rerender(
            <Component
                fileDataProps={{
                    previewData: { src: 'data:image/png;base64,', duration: 12 },
                    fileType: 'mpeg4',
                }}
            />
        );
        expect(within(getByRole('thumbnail')).getByRole('imagelazyloader')).toBeInTheDocument();

        fireEvent.load(getByRole('img'));

        expect(within(getByRole('imagelazyloader')).getByRole('img')).toBeInTheDocument();
        expect(within(getByRole('thumbnail')).getByText('00:12')).toBeInTheDocument();
        expect(within(getByRole('thumbnail')).getByText('mpeg4')).toBeInTheDocument();

        // restore IntersectionObserver
        window.IntersectionObserver = observer;
    });
});

describe('DefaultFileItemRenderer customization', () => {
    test('should render custom file item component', () => {
        // const customComponent: (args: IFileItemComponentProps) => JSX.Element = (args) => {
        //     return (
        //         <div data-testid="custom-component">
        //         {args.fileData.fileName}
        //         </div>
        //     )
        // }

        const { getByTestId } = render(
            <Component
                fileItemProps={{
                    overrides: {
                        component: (args) => {
                            return (
                                <div data-testid="custom-component">{args.fileData.fileName}</div>
                            );
                        },
                    },
                }}
            />
        );

        expect(getByTestId('custom-component')).toBeInTheDocument();
    });

    test('should override default root', () => {
        const { rerender, getAllByRole, getByRole, getByTestId } = render(
            <Component
                // fileDataProps={{ state: 'local' }}
                fileItemProps={{
                    overrides: {
                        rootStyles: {
                            base: { className: 'test-base', style: { background: 'red' } },
                            local: { className: 'test-local', style: { top: 10 } },
                        },
                    },
                }}
            />
        );

        expect(getByRole('fileitem')).toHaveClass('test-base test-local');
        expect(getByRole('fileitem')).toHaveStyle('background: red; opacity: 1; top: 10px;');

        rerender(
            <Component
                fileDataProps={{ state: 'uploaded' }}
                fileItemProps={{
                    overrides: {
                        rootStyles: {
                            base: { className: 'test-base', style: { background: 'red' } },
                            uploaded: {
                                className: 'test-uploaded',
                                style: { top: 11, opacity: 0.1 },
                            },
                        },
                    },
                }}
            />
        );

        expect(getByRole('fileitem')).toHaveClass('test-base test-uploaded');
        expect(getByRole('fileitem')).toHaveStyle('background: red; opacity: 0.1; top: 11px;');

        rerender(
            <Component
                fileDataProps={{ state: 'uploading' }}
                fileItemProps={{
                    overrides: {
                        rootStyles: {
                            base: { className: 'test-base', style: { background: 'red' } },
                            uploading: { className: 'test-uploading', style: { top: 12 } },
                        },
                    },
                }}
            />
        );

        expect(getByRole('fileitem')).toHaveClass('test-base test-uploading');
        expect(getByRole('fileitem')).toHaveStyle('background: red; opacity: 1; top: 12px;');

        rerender(
            <Component
                fileDataProps={{ state: 'deletionError' }}
                fileItemProps={{
                    overrides: {
                        rootStyles: {
                            base: { className: 'test-base', style: { background: 'red' } },
                            deletionError: { className: 'test-deletion-error', style: { top: 13 } },
                        },
                    },
                }}
            />
        );

        expect(getByRole('fileitem')).toHaveClass('test-base test-deletion-error');
        expect(getByRole('fileitem')).toHaveStyle('background: red; opacity: 1; top: 13px;');

        rerender(
            <Component
                fileDataProps={{ state: 'uploadError' }}
                fileItemProps={{
                    overrides: {
                        rootStyles: {
                            base: { className: 'test-base', style: { background: 'red' } },
                            uploadError: { className: 'test-upload-error', style: { top: 14 } },
                        },
                    },
                }}
            />
        );

        expect(getByRole('fileitem')).toHaveClass('test-base test-upload-error');
        expect(getByRole('fileitem')).toHaveStyle('background: red; opacity: 1; top: 14px;');
    });

    test('should override default titles', () => {
        const titles = {
            cancelUpload: 'cu',
            confirmDescription: 'cd',
            removeLocalFile: 'rlf',
            undoDescription: 'ud',
            uploadFile: 'uf',
            menuButtonTitle: 'mbTitle',
            menuItemDelete: 'miDelete',
            menuItemDownload: 'miDownload',
            menuItemRename: 'miRename',
            menuItemView: 'miView',
        };

        const { rerender, getAllByRole, getByRole, getByTestId } = render(
            <Component fileItemProps={{ overrides: { titles } }} />
        );

        let buttons = getAllByRole('button');
        expect(buttons[0]).toHaveAttribute('title', 'uf');
        expect(buttons[1]).toHaveAttribute('title', 'rlf');

        rerender(
            <Component
                fileDataProps={{ state: 'uploading' }}
                fileItemProps={{ overrides: { titles } }}
            />
        );

        expect(getByRole('button')).toHaveAttribute('title', 'cu');

        rerender(
            <Component
                fileDataProps={{ state: 'uploaded', editMode: true }}
                fileItemProps={{ overrides: { titles } }}
            />
        );

        buttons = getAllByRole('button');
        expect(buttons[0]).toHaveAttribute('title', 'cd');
        expect(buttons[1]).toHaveAttribute('title', 'ud');

        rerender(
            <Component
                fileDataProps={{ state: 'uploaded' }}
                fileItemProps={{
                    overrides: { titles },
                    setFileDescription: renameFileDescriptionSuccess,
                }}
            />
        );

        expect(getByRole('button')).toHaveAttribute('title', 'mbTitle');

        const menu = getByRole('menu', { hidden: true });
        expect(within(menu).queryByText('miView')).not.toBeNull();
        expect(within(menu).queryByText('miDownload')).not.toBeNull();
        expect(within(menu).queryByText('miRename')).not.toBeNull();
        expect(within(menu).queryByText('miDelete')).not.toBeNull();
    });

    test('should override default buttons (control)', () => {
        // local state
        const { rerender, getAllByRole, getByRole } = render(
            <Component
                fileItemProps={{
                    overrides: {
                        controlField: {
                            buttons: () => ({
                                uploadFile: { children: 'upload', props: { title: 'upload' } },
                                removeLocalFile: { children: 'remove', props: { title: 'remove' } },
                            }),
                        },
                    },
                }}
            />
        );

        let btns = within(getByRole('control')).queryAllByRole('button');
        expect(btns[0].innerHTML).toEqual('upload');
        expect(btns[0]).toHaveAttribute('title', 'upload');
        expect(btns[1].innerHTML).toEqual('remove');
        expect(btns[1]).toHaveAttribute('title', 'remove');

        // uploading state
        rerender(
            <Component
                fileDataProps={{ state: 'uploading' }}
                fileItemProps={{
                    overrides: {
                        controlField: {
                            buttons: () => ({
                                cancelUpload: { children: 'cancel', props: { title: 'cancel' } },
                            }),
                        },
                    },
                }}
            />
        );

        btns = within(getByRole('control')).queryAllByRole('button');
        expect(btns[0].innerHTML).toEqual('cancel');
        expect(btns[0]).toHaveAttribute('title', 'cancel');

        // uploading state with no ability to cancel uploading (uploadFilesInOneRequest = true)
        rerender(
            <Component
                fileDataProps={{ state: 'uploading', cancelUpload: null }}
                fileItemProps={{
                    overrides: {
                        controlField: {
                            buttons: () => ({
                                loadingIcon: <div data-testid="stub"></div>,
                            }),
                        },
                    },
                }}
            />
        );

        expect(within(getByRole('control')).getByTestId('stub')).toBeInTheDocument();

        // uploaded file in edit mode
        rerender(
            <Component
                fileDataProps={{ state: 'uploaded', editMode: true }}
                fileItemProps={{
                    overrides: {
                        controlField: {
                            buttons: () => ({
                                confirmDescription: {
                                    children: 'confirm',
                                    props: { title: 'confirm' },
                                },
                                undoDescription: {
                                    children: 'discard',
                                    props: { title: 'discard' },
                                },
                            }),
                        },
                    },
                }}
            />
        );

        btns = within(getByRole('control')).queryAllByRole('button');
        expect(btns[0].innerHTML).toEqual('confirm');
        expect(btns[0]).toHaveAttribute('title', 'confirm');
        expect(btns[1].innerHTML).toEqual('discard');
        expect(btns[1]).toHaveAttribute('title', 'discard');
    });

    test('should override default menu (control)', () => {
        // local state
        const { rerender, getAllByRole, getByRole } = render(
            <Component
                fileDataProps={{ state: 'uploaded' }}
                fileItemProps={{
                    overrides: {
                        controlField: {
                            menu: () => ({
                                buttonChildren: 'test',
                                buttonProps: { title: 'test' },
                                menuItemNames: {
                                    menuItemView: '1',
                                    menuItemDownload: '2',
                                    menuItemRename: '3',
                                    menuItemDelete: '4',
                                },
                                menuItemStyle: { className: 'menu-item-test-class' },
                                menuStyles: {
                                    layer: { background: 'red' },
                                    menu: { background: 'green' },
                                },
                            }),
                        },
                    },
                    setFileDescription: renameFileDescriptionSuccess,
                }}
            />
        );

        expect(within(getByRole('button')).queryByText('test')).not.toBeNull();
        expect(getByRole('button')).toHaveAttribute('title', 'test');
        act(() => {
            getByRole('button').click();
        });

        expect(getByRole('layer')).toHaveStyle('background: red;');
        expect(getByRole('menu')).toHaveStyle('background: green;');

        getAllByRole('menuitem').forEach((el, i) => {
            expect(el).toHaveClass('menu-item-test-class');
            expect(el.querySelector('svg')).not.toBeNull();
            expect(within(el).queryByText(i + 1)).not.toBeNull();
        });

        // hide icons
        rerender(
            <Component
                fileDataProps={{ state: 'uploaded' }}
                fileItemProps={{
                    overrides: {
                        controlField: {
                            menu: () => ({
                                displayIcons: false,
                            }),
                        },
                    },
                }}
            />
        );

        getAllByRole('menuitem').forEach((el, i) => {
            expect(el.querySelector('svg')).toBeNull();
        });
    });

    test('should override default control component', () => {
        const controlFieldComponent: TControlFieldComponent = () => (
            <div role="customcontrol"></div>
        );
        const fileItemProps = {
            overrides: {
                controlField: {
                    component: controlFieldComponent,
                },
            },
        };

        // local state
        const { rerender, queryByRole } = render(
            <Component fileDataProps={{ state: 'local' }} fileItemProps={fileItemProps} />
        );

        expect(queryByRole('control')).not.toBeInTheDocument();
        expect(queryByRole('customcontrol')).toBeInTheDocument();

        const check = (state: TFileItemState) => {
            rerender(<Component fileDataProps={{ state }} fileItemProps={fileItemProps} />);

            expect(queryByRole('control')).not.toBeInTheDocument();
            expect(queryByRole('customcontrol')).toBeInTheDocument();
        };

        check('uploaded');
        check('deletionError');
        check('uploadError');
        check('uploading');
    });

    test('should check control component params', () => {
        const controlComponent: TControlFieldComponent = ({
            changeDescription,
            changeDescriptionMode,
            confirmDescriptionChanges,
            undoDescriptionChanges,
            deleteFile,
            viewFile,
            uploadFile,
            downloadFile,
            fileData,
            noKeyboard,
            readOnly,
            disabled,
        }) => {
            expect(deleteFile).toEqual(deleteFile);
            expect(uploadFile).toEqual(uploadFile);
            expect(downloadFile).toEqual(downloadFile);
            expect(viewFile).toEqual(viewFile);

            expect(changeDescription).toEqual(expect.any(Function));
            expect(changeDescriptionMode).toEqual(expect.any(Function));
            expect(confirmDescriptionChanges).toEqual(expect.any(Function));
            expect(undoDescriptionChanges).toEqual(expect.any(Function));

            expect(fileData).toEqual(defaultFileData);

            expect(disabled).toEqual(true);
            expect(readOnly).toEqual(true);
            expect(noKeyboard).toEqual(true);

            return <div role="controlcomponent"></div>;
        };

        const fileItemProps = {
            overrides: {
                controlField: {
                    component: controlComponent,
                },
            },
            disabled: true,
            readOnly: true,
            noKeyboard: true,
            setFileDescription: renameFileDescriptionSuccess,
        };

        const { queryByRole } = render(
            <Component fileDataProps={defaultFileData} fileItemProps={fileItemProps} />
        );

        expect(queryByRole('controlcomponent')).toBeInTheDocument();
    });

    test('should override default fileName styles', () => {
        const { rerender, getAllByRole, getByRole, getByTestId } = render(
            <Component
                fileItemProps={{
                    overrides: {
                        inputFieldStyles: () => ({
                            textField: { className: 'textfield-test-class' },
                        }),
                    },
                }}
            />
        );

        expect(getByRole('textbox')).toHaveClass('textfield-test-class');

        rerender(
            <Component
                fileDataProps={{ state: 'uploaded' }}
                fileItemProps={{
                    overrides: {
                        inputFieldStyles: () => ({
                            readOnlyText: { className: 'text-test-class' },
                        }),
                    },
                }}
            />
        );

        expect(getByTestId('read-only-text')).toHaveClass('text-test-class');
    });

    test('should override default fileName component', () => {
        const inputFieldComponent: TInputFieldComponent = ({
            changeDescription,
            changeDescriptionMode,
            confirmDescriptionChanges,
            undoDescriptionChanges,
            getInputFieldProps,
            fileData,
            disabled,
            readOnly,
        }) => {
            expect(changeDescription).toEqual(expect.any(Function));
            expect(changeDescriptionMode).toEqual(expect.any(Function));
            expect(confirmDescriptionChanges).toEqual(expect.any(Function));
            expect(undoDescriptionChanges).toEqual(expect.any(Function));
            expect(getInputFieldProps).toEqual(expect.any(Function));

            expect(fileData).toEqual(defaultFileData);
            expect(disabled).toEqual(true);
            expect(readOnly).toEqual(true);

            return <div role="filenamecomponent"></div>;
        };

        const { rerender, queryByRole } = render(
            <Component
                fileItemProps={{
                    overrides: {
                        inputFieldComponent,
                    },
                    disabled: true,
                    readOnly: true,
                    setFileDescription: renameFileDescriptionSuccess,
                }}
                fileDataProps={defaultFileData}
            />
        );

        expect(queryByRole('filenamecomponent')).toBeInTheDocument();
    });

    test('should override default fileSize style', () => {
        const { rerender, getAllByRole, getByRole, getByTestId } = render(
            <Component
                fileItemProps={{
                    overrides: {
                        sizeFieldStyle: () => ({ className: 'test-file-size-class' }),
                    },
                }}
            />
        );

        expect(getByRole('filesize')).toHaveClass('test-file-size-class');
    });

    test('should override default fileSize component', () => {
        const sizeFieldComponent: TSizeFieldComponent = ({
            formatSize: fs,
            fileData,
            disabled,
            readOnly,
        }) => {
            expect(fs).toEqual(formatSize);

            expect(fileData).toEqual(defaultFileData);
            expect(disabled).toEqual(true);
            expect(readOnly).toEqual(true);

            return <div role="filesizecomponent"></div>;
        };

        const { queryByRole } = render(
            <Component
                fileItemProps={{
                    overrides: {
                        sizeFieldComponent,
                    },
                    disabled: true,
                    readOnly: true,
                }}
                fileDataProps={defaultFileData}
            />
        );

        expect(queryByRole('filesizecomponent')).toBeInTheDocument();
    });

    test('should override default thumbnail styles', () => {
        const thumbnailFieldStyles: TThumbnailFieldStyles = ({ fileData, readOnly, disabled }) => {
            expect(fileData).toEqual(defaultFileData);
            expect(disabled).toEqual(true);
            expect(readOnly).toEqual(true);

            return {
                container: { color: 'red' },
                default: { color: 'green' },
            };
        };

        const { rerender, getAllByRole, getByRole, getByTestId } = render(
            <Component
                fileItemProps={{
                    overrides: {
                        thumbnailFieldStyles,
                    },
                    disabled: true,
                    readOnly: true,
                }}
            />
        );

        const thumbnail = getByRole('thumbnail');
        expect(thumbnail).toHaveStyle('color: red;');
        expect(within(thumbnail).queryByText('txt')).toHaveStyle('color: green;');

        rerender(
            <Component
                fileItemProps={{
                    overrides: {
                        thumbnailFieldStyles: () => ({
                            type: { color: 'white' },
                            loading: { color: 'black' },
                        }),
                    },
                }}
                fileDataProps={{
                    file: mockFile(),
                    previewData: { src: null },
                }}
            />
        );

        expect(within(getByRole('thumbnail')).queryByText('txt')).toHaveStyle('color: white;');
        expect(within(getByRole('thumbnail')).queryByTestId('loading-icon')).toHaveStyle(
            'color: black;'
        );

        rerender(
            <Component
                fileItemProps={{
                    overrides: {
                        thumbnailFieldStyles: () => ({
                            audio: {
                                type: { color: 'brown' },
                                buttonContainer: { color: 'orange' },
                                buttonStart: { color: 'blue' },
                                buttonStop: { color: 'lavender' },
                                duration: { color: 'purple' },
                            },
                        }),
                    },
                }}
                fileDataProps={{
                    file: mockFile(undefined, undefined, 'audio/mpeg'),
                    previewData: { src: 'data:audio/wav;base64,', duration: 12 },
                    fileType: 'mpeg',
                }}
            />
        );

        const playBtn = within(getByRole('thumbnail')).queryByRole('button');
        expect(playBtn).toHaveStyle('color: orange;');
        expect(within(getByRole('thumbnail')).queryByTestId('play-icon')).toHaveStyle(
            'color: blue;'
        );
        expect(within(getByRole('thumbnail')).queryByText('mpeg')).toHaveStyle('color: brown;');
        expect(within(getByRole('thumbnail')).queryByText('00:12')).toHaveStyle('color: purple;');

        act(() => {
            playBtn.click();
        });

        expect(within(getByRole('thumbnail')).queryByTestId('stop-icon')).toHaveStyle(
            'color: lavender;'
        );
        expect(within(getByRole('thumbnail')).queryByText('00:00')).toHaveStyle('color: purple;');

        // set IntersectionObserver to undefined to invoke intersection callback
        const observer = window.IntersectionObserver;
        window.IntersectionObserver = undefined;
        jest.spyOn(console, 'info').mockImplementation(() => undefined);

        rerender(
            <Component
                fileItemProps={{
                    overrides: {
                        thumbnailFieldStyles: () => ({
                            image: { color: 'lime' },
                            duration: { color: 'cyan' },
                            type: { color: 'gray' },
                            loading: { color: 'coral' },
                        }),
                    },
                }}
                fileDataProps={{
                    previewData: { src: 'data:image/png;base64,', duration: 12 },
                    fileType: 'mpeg4',
                }}
            />
        );

        const svg = getByRole('imagelazyloader').firstChild;
        expect(svg).toHaveStyle('color: coral;');

        const img = within(getByRole('thumbnail')).queryByRole('img');

        fireEvent.load(img);

        expect(img).toHaveStyle('color: lime;');
        expect(within(getByRole('thumbnail')).queryByText('mpeg4')).toHaveStyle('color: gray;');
        expect(within(getByRole('thumbnail')).queryByText('00:12')).toHaveStyle('color: cyan;');

        // restore IntersectionObserver
        window.IntersectionObserver = observer;
    });

    test('should override default thumbnail component', () => {
        const thumbnailFieldComponent: TThumbnailFieldComponent = ({
            fileData,
            disabled,
            readOnly,
        }) => {
            expect(fileData).toEqual(defaultFileData);
            expect(disabled).toEqual(true);
            expect(readOnly).toEqual(true);

            return <div role="thumbnailcomponent"></div>;
        };

        const { queryByRole } = render(
            <Component
                fileItemProps={{
                    overrides: {
                        thumbnailFieldComponent,
                    },
                    disabled: true,
                    readOnly: true,
                }}
                fileDataProps={defaultFileData}
            />
        );

        expect(queryByRole('thumbnailcomponent')).toBeInTheDocument();
    });

    test('should override progressBar and readOnlyLabel components', () => {
        const { rerender, getAllByRole, getByRole, getByTestId } = render(
            <Component
                fileDataProps={{ readOnly: true }}
                fileItemProps={{
                    overrides: {
                        readOnlyIconComponent: () => <div data-testid="custom-readonlylabel"></div>,
                    },
                }}
            />
        );

        expect(getByTestId('custom-readonlylabel')).toBeInTheDocument();

        const progressBarComponent: TProgressBarComponent = (progress) => {
            expect(progress).toEqual(25);
            return <div data-testid="custom-progress"></div>;
        };

        rerender(
            <Component
                fileDataProps={{ state: 'uploading', uploadedSize: 512 }}
                fileItemProps={{
                    overrides: {
                        progressBarComponent,
                    },
                }}
            />
        );

        expect(getByTestId('custom-progress')).toBeInTheDocument();
    });
});
