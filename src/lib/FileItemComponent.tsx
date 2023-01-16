import React, { FC, ReactElement, ReactNode, useCallback, useEffect, useRef } from 'react';

import { TThrowError } from './Utils/errors';
import { TStyle, SameType, TComponent, ExtractKeys } from './Utils/types';

// internal state of a file item (0 - initial, 1 - uploading, 2 - uploaded, 3 - upload error, 4 - deletion error)
export type TFileItemState = 'initial' | 'uploading' | 'uploaded' | 'uploadError' | 'deletionError';

export interface IFileData {
    uid?: string;
    fileName: string;
    fileSize: number;
    fileType?: string;
    previewData?: {
        src: string;
        duration?: number;
        [x: string]: any;
    };
    description?: string;
    readOnly?: boolean;
    disabled?: boolean;
}

export interface IRemoteFileData extends IFileData {
    state: TFileItemState;
    oldDescription?: string;
    editMode?: boolean;
    elementRef?: React.RefObject<HTMLDivElement>;
}

export interface ILocalFileData extends IRemoteFileData {
    file: File;
    cancelUpload?: () => void;
    uploadedSize: number;
    totalSize: number;
    shouldBeRemoved?: boolean;
}

export interface IItemActions {
    changeDescription: (e: React.ChangeEvent<HTMLInputElement>) => void;
    undoDescriptionChanges: () => void;
    changeDescriptionMode: () => void;
    confirmDescriptionChanges: () => Promise<void>;
    deleteFile: (fileData: IRemoteFileData | ILocalFileData) => void;
    uploadFile?: (fileData: ILocalFileData) => void;
    downloadFile: (fileData: IRemoteFileData) => void;
    viewFile: (fileData: IRemoteFileData) => void;
}

export interface IItemProps {
    ref: React.RefObject<HTMLDivElement>;
    id: string;
    key: string;
    onClick: (e: React.MouseEvent) => void;
}

export interface IItemCommonProps {
    root: HTMLDivElement;
    formatSize: (size: number) => string;
    isLocalFile: boolean;
    showProgress: boolean;
    readOnly: boolean;
    disabled: boolean;
    isDragActive: boolean;
    noKeyboard: boolean;
}

export interface ITextFieldProps {
    id: string;
    value: string;
    title: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onKeyUp: (e: React.KeyboardEvent) => void;
    onFocus: (e: React.FocusEvent) => void;
    onBlur: (e: React.FocusEvent) => void;
}

export interface IFileItemComponentProps {
    fileData: Readonly<ILocalFileData>;
    getTextFieldProps: () => ITextFieldProps;
    getItemProps: () => IItemProps;
    getCommonProps: () => IItemCommonProps;
    getActions: () => IItemActions;
}

type TButtonProps = TStyle & { title?: string };
type TOverriddenFileItemFuncProps = {
    fileData: ILocalFileData;
    readOnly: boolean;
    disabled: boolean;
};

export type TFileSize = (props: TOverriddenFileItemFuncProps) => TStyle;
export type TThumbnail = (props: TOverriddenFileItemFuncProps) => ReactElement;
export type TFileName = (props: TOverriddenFileItemFuncProps) => {
    readOnlyText?: TStyle;
    textField?: TStyle;
};
export type TActionMenu = (props: TOverriddenFileItemFuncProps) => {
    buttonProps?: TButtonProps;
    buttonChildren?: ReactNode;
    menuStyles?: {
        layer?: React.CSSProperties;
        menu?: React.CSSProperties;
    };
    menuItemStyle?: TStyle;
    menuItemNames?: TMenuItemNames;
    displayIcons?: boolean;
};
type TButton = { props?: TButtonProps; children?: ReactNode };
export type TButtons = (
    props: TOverriddenFileItemFuncProps & { uploadFilesInOneRequestMode: boolean }
) => {
    uploadFile?: TButton;
    cancelUpload?: TButton;
    removeLocalFile?: TButton;
    confirmDescription?: TButton;
    undoDescription?: TButton;
    stub?: ReactNode;
};
export type TProgressBar = (progress: number) => ReactElement;
export type TReadOnlyLabel = () => ReactElement;
export type TMenuItemNames = Partial<
    SameType<string, 'menuItemView' | 'menuItemDownload' | 'menuItemRename' | 'menuItemDelete'>
>;
export type TTitles = Partial<
    SameType<
        string,
        | 'uploadFile'
        | 'cancelUpload'
        | 'removeLocalFile'
        | 'confirmDescription'
        | 'undoDescription'
        | 'menuButtonTitle'
    >
> &
    TMenuItemNames;

export type TFileItemRootStyles = Partial<SameType<TStyle, ExtractKeys<typeof defaultClassNames>>>;

export interface IOverriddenFileItem {
    rootStyles?: TFileItemRootStyles;
    thumbnail?: TThumbnail;
    fileName?: TFileName;
    fileSize?: TFileSize;
    actionMenu?: TActionMenu;
    buttons?: TButtons;
    progressBar?: TProgressBar;
    readOnlyLabel?: TReadOnlyLabel;
    titles?: TTitles;
    component?: TComponent<IFileItemComponentProps>;
}

export interface IItemMountState {
    fileData: IRemoteFileData | ILocalFileData;
    element: HTMLDivElement;
    isLocalFile: boolean;
    state?: 'mount' | 'unmount';
}

export interface IItemRef {
    fileData: ILocalFileData;
    elementRef: React.RefObject<HTMLDivElement>;
    isLocalFile: boolean;
}

export interface IFileItemProps {
    itemRefs: React.RefObject<IItemRef[]>;
    root: HTMLDivElement;
    component: TComponent<IFileItemComponentProps>;
    fileData: ILocalFileData;
    formatSize: (size: number) => string;
    uploadFile?: (fileData: ILocalFileData) => void;
    deleteFile: (fileData: ILocalFileData) => void;
    downloadFile?: (fileData: ILocalFileData) => void;
    viewFile?: (fileData: ILocalFileData) => void;
    setFileDescription?: (fileData: ILocalFileData) => Promise<string>;
    updateFileData: (
        input: Partial<IRemoteFileData> | ((item: IRemoteFileData) => IRemoteFileData),
        uid: string | number
    ) => void;
    itemMountStates: React.RefObject<IItemMountState[]>;
    throwError?: TThrowError;
    showProgress: boolean;
    readOnly: boolean;
    disabled: boolean;
    isDragActive: boolean;
    noKeyboard: boolean;
    readonly isLocalFile: boolean;
}

// -----------------------------------------------------------------------------

export const defaultClassNames = {
    base: 'display-item',
    local: 'display-item-local',
    uploading: 'display-item-uploading',
    uploaded: 'display-item-uploaded',
    uploadError: 'display-item-upload-error',
    deletionError: 'display-item-del-error',
    editMode: 'display-item-edit-mode',
    uploadedDisabled: 'display-item-uploaded-disabled',
    localDisabled: 'display-item-local-disabled',
};

// -----------------------------------------------------------------------------

// interface IRFC<T> {
//     (props: T): ReactElement;
// }

export const FileItemComponent: FC<IFileItemProps> = ({
    itemRefs,
    root,
    component,
    fileData,
    formatSize,
    uploadFile,
    deleteFile,
    downloadFile,
    viewFile,
    setFileDescription,
    updateFileData,
    itemMountStates,
    throwError,
    showProgress,
    readOnly,
    disabled,
    isDragActive,
    noKeyboard,
    isLocalFile,
}) => {
    const textFieldId = `fileDescriptionTextField-${fileData.uid}`;
    const fileItemRef = useRef<HTMLDivElement>();

    itemRefs.current.push({ fileData, elementRef: fileItemRef, isLocalFile });

    useEffect(() => {
        const { current: ref } = fileItemRef;
        itemMountStates.current.push({ fileData, element: ref, isLocalFile, state: 'mount' });
        return () => {
            itemMountStates.current.push({ fileData, element: ref, isLocalFile, state: 'unmount' });
        };
    }, []);

    const changeDescription = useCallback(
        !!updateFileData
            ? (e: React.ChangeEvent<HTMLInputElement>) =>
                  updateFileData({ description: e.target.value }, fileData.uid)
            : null,
        [updateFileData, fileData.uid]
    );

    const undoDescriptionChanges = useCallback(
        !!setFileDescription
            ? () =>
                  updateFileData(
                      {
                          description: fileData.oldDescription,
                          editMode: false,
                      },
                      fileData.uid
                  )
            : null,
        [setFileDescription, updateFileData, fileData.uid]
    );

    const changeDescriptionMode = useCallback(
        !!setFileDescription
            ? () => {
                  updateFileData(
                      (item) => (
                          (item.editMode = !item.editMode),
                          (item.description = item.description || item.fileName),
                          item
                      ),
                      fileData.uid
                  );
                  setTimeout(() => {
                      const textField = root
                          ? root.querySelector(`#${textFieldId}`)
                          : document.getElementById(fileData.uid).querySelector(`#${textFieldId}`);
                      if (textField) (textField as HTMLElement).focus();
                  });
              }
            : null,
        [setFileDescription, updateFileData, fileData.uid, root]
    );

    const confirmDescriptionChanges = useCallback(
        !!setFileDescription
            ? () =>
                  setFileDescription(((fileData.elementRef = fileItemRef), fileData)) // comma operator
                      .then((description) => {
                          updateFileData(
                              (item) => (
                                  (item.editMode = false),
                                  (item.description = item.oldDescription = description),
                                  item
                              ),
                              fileData.uid
                          );
                      })
                      .catch(
                          (message: string) => (
                              undoDescriptionChanges(),
                              throwError('rename_error', message, { file: fileData })
                          )
                      )
            : null,
        [setFileDescription, updateFileData, undoDescriptionChanges, fileData]
    );

    const onFocus = useCallback(
        !!!setFileDescription ? () => updateFileData({ editMode: true }, fileData.uid) : null,
        [setFileDescription, updateFileData, fileData.uid]
    );

    const onBlur = useCallback(
        !!!setFileDescription ? () => updateFileData({ editMode: false }, fileData.uid) : null,
        [setFileDescription, updateFileData, fileData.uid]
    );

    // Grouping properties

    const getTextFieldProps = () => ({
        id: textFieldId,
        value: fileData.description,
        title: fileData.fileName,
        onChange: changeDescription,
        onKeyUp: (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' && confirmDescriptionChanges) confirmDescriptionChanges();
            if (e.key === 'Escape' && undoDescriptionChanges) undoDescriptionChanges();
        },
        onFocus,
        onBlur,
    });

    const getItemProps = () => ({
        role: 'fileitem',
        ref: fileItemRef,
        id: fileData.uid,
        key: `fileItemComponent-${fileData.uid}`,
        onClick: (e: React.MouseEvent) => e.stopPropagation(),
    });

    const getCommonProps = () => ({
        root,
        formatSize,
        isLocalFile,
        showProgress,
        readOnly,
        disabled,
        isDragActive,
        noKeyboard,
    });

    const getActions = () => ({
        changeDescription,
        undoDescriptionChanges,
        changeDescriptionMode,
        confirmDescriptionChanges,
        deleteFile,
        uploadFile,
        downloadFile,
        viewFile,
    });

    return component({
        fileData,
        getTextFieldProps,
        getItemProps,
        getCommonProps,
        getActions,
    });
};
