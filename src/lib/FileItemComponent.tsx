import React, { FC, ReactElement, ReactNode, useCallback, useEffect, useRef } from 'react';
import { IAudioThumbnailProps } from './Components';

import { TThrowError } from './Utils/errors';
import { TStyle, SameType, TComponent, ExtractKeys } from './Utils/types';

// internal state of a file item (0 - local, 1 - uploading, 2 - uploaded, 3 - upload error, 4 - deletion error)
/**
 * Represents the internal state of a file item.
 */
export type TFileItemState = 'local' | 'uploading' | 'uploaded' | 'uploadError' | 'deletionError';

/**
 * Represents a function for formatting file sizes.
 * @param size The size in bytes.
 * @returns The formatted file size as a string.
 */
export type TFileSizeFormatter = (size: number) => string;

/**
 * Represents the common data of a file.
 */
export interface IFileData {
    /**
     * The unique identifier of the file.
     */
    uid?: string;
    /**
     * The name of the file.
     */
    fileName: string;
    /**
     * The size of the file in bytes.
     */
    fileSize: number;
    /**
     * The type of the file.
     */
    fileType?: string;
    /**
     * Represents the preview data for the thumbnail of a file.
     */
    previewData?: {
        /**
         * The source URL for the file preview. This can be represented as a base64 string or a regular URL.
         */
        src: string;
        /**
         * The duration of the video or audio (if applicable).
         */
        duration?: number;
        [x: string]: any;
    };
    /**
     * The description of the file.
     */
    description?: string;
    /**
     * Indicates if the file is read-only.
     */
    readOnly?: boolean;
    /**
     * Indicates if the file is disabled.
     */
    disabled?: boolean;
}

/**
 * Represents remote file data, extending the {@link IFileData} interface
 */
export interface IRemoteFileData extends IFileData {
    /**
     * The state of the file item.
     */
    state: TFileItemState;
    /**
     * The previous description of the file.
     */
    oldDescription?: string;
    /**
     * Specifies whether the file is in edit mode.
     */
    editMode?: boolean;
    /**
     * Reference to the HTMLDivElement element associated with the file item.
     */
    elementRef?: React.RefObject<HTMLDivElement>;
}

/**
 * Represents local file data, extending the {@link IRemoteFileData} interface.
 */
export interface ILocalFileData extends IRemoteFileData {
    /**
     * The actual File object.
     */
    file: File;
    /**
     * Function to cancel the file upload process.
     */
    cancelUpload?: () => void;
    /**
     * The size of the file that has been uploaded.
     */
    uploadedSize: number;
    /**
     * The total size of the file.
     */
    totalSize: number;
    // shouldBeRemoved?: boolean; // This is only for internal purposes, so it was hidden
}

/**
 * Represents actions that can be performed on a file item.
 */
export interface IItemActions {
    /**
     * Function to handle the change event of the description input field.
     */
    changeDescription?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    /**
     * Function to undo changes made to the description.
     */
    undoDescriptionChanges?: () => void;
    /**
     * Function to switch to the description editing mode.
     */
    changeDescriptionMode?: () => void;
    /**
     * Function to confirm and save changes made to the description.
     */
    confirmDescriptionChanges?: () => Promise<void>;
    /**
     * Function to delete a file.
     */
    deleteFile?: (fileData: IRemoteFileData | ILocalFileData) => void;
    /**
     * Function to upload a file.
     */
    uploadFile?: (fileData: ILocalFileData) => void;
    /**
     * Function to download a file.
     */
    downloadFile?: (fileData: IRemoteFileData) => void;
    /**
     * Function to view a file.
     */
    viewFile?: (fileData: IRemoteFileData) => void;
}

/**
 * Props for the item component.
 */
export interface IItemProps {
    /**
     * Reference to the item's HTML div element.
     */
    ref: React.RefObject<HTMLDivElement>;
    /**
     * The unique identifier for the item.
     */
    id: string;
    /**
     * The key for the item used in React's reconciliation process.
     */
    key: string;
    /**
     * Event handler for the item's click event.
     */
    onClick: (e: React.MouseEvent) => void;
}

/**
 * Common props shared by item components.
 */
export interface IItemCommonProps {
    /**
     * The root HTML div element for the item.
     */
    root: HTMLDivElement;
    /**
     * A function to format the size of the file.
     * @param size - The size of the file in bytes.
     * @returns The formatted size as a string.
     */
    formatSize: (size: number) => string;
    /**
     * Indicates whether the item is a local file.
     */
    isLocalFile: boolean;
    /**
     * Specifies whether to show upload progress.
     */
    showProgress: boolean;
    /**
     * Indicates whether the item is in read-only mode.
     */
    readOnly: boolean;
    /**
     * Indicates whether the item is disabled.
     */
    disabled: boolean;
    /**
     * Indicates whether the user is currently dragging files.
     */
    isDragActive: boolean;
    /**
     * Indicates whether keyboard interactions are disabled.
     */
    noKeyboard: boolean;
}

/**
 * Props for the input field.
 */
export interface IInputFieldProps {
    /**
     * The unique identifier for the input field.
     */
    id: string;
    /**
     * The current value of the input field.
     */
    value: string;
    /**
     * The title for the input field.
     */
    title: string;
    /**
     * Event handler for the `change` event of the input field.
     */
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    /**
     * Event handler for the `keyup` event of the input field.
     */
    onKeyUp: (e: React.KeyboardEvent) => void;
    /**
     * Event handler for the `focus` event of the input field.
     */
    onFocus: (e: React.FocusEvent) => void;
    /**
     * Event handler for the `blur` event of the input field.
     */
    onBlur: (e: React.FocusEvent) => void;
}

/**
 * Represents the props for the FileItem component.
 */
export interface IFileItemComponentProps {
    /**
     * The file data of the item.
     */
    fileData: Readonly<ILocalFileData>;
    /**
     * A function that returns the input field props for the item.
     */
    getInputFieldProps: () => IInputFieldProps;
    /**
     * A function that returns the item props such as `ref`, `id`, `key`, and `onClick`.
     */
    getItemProps: () => IItemProps;
    /**
     * A function that returns the common props like `root`, `disabled`, `isLocalFile`, etc.
     */
    getCommonProps: () => IItemCommonProps;
    /**
     * A function that returns the actions for the item.
     */
    getActions: () => IItemActions;
}

type TButtonProps = TStyle & { title?: string };
type TOverriddenFileItemFuncProps = {
    fileData: ILocalFileData;
    readOnly: boolean;
    disabled: boolean;
};

/**
 * Represents a set of custom styles for a thumbnail field.
 */
interface IThumbnailStyles {
    container?: React.CSSProperties;
    type?: React.CSSProperties;
    loading?: React.CSSProperties;
    audio?: IAudioThumbnailProps['styles'];
    image?: React.CSSProperties;
    duration?: React.CSSProperties;
    default?: React.CSSProperties;
}

/**
 * Props for the input field component.
 */
export interface IInputFieldComponentProps {
    /**
     * The file data of the item.
     */
    fileData: ILocalFileData;
    /**
     * Indicates whether the input field is in read-only mode.
     */
    readOnly: boolean;
    /**
     * Indicates whether the input field is disabled.
     */
    disabled: boolean;
    /**
     * Event handler for changing the description of the file.
     */
    changeDescription: IItemActions['changeDescription'];
    /**
     * Event handler for changing the description mode of the file.
     */
    changeDescriptionMode: IItemActions['changeDescriptionMode'];
    /**
     * Event handler for confirming the changes made to the description of the file.
     */
    confirmDescriptionChanges: IItemActions['confirmDescriptionChanges'];
    /**
     * Event handler for undoing the changes made to the description of the file.
     */
    undoDescriptionChanges: IItemActions['undoDescriptionChanges'];
    /**
     * Function that returns the props for the input field.
     */
    getInputFieldProps: () => IInputFieldProps;
}

/**
 * Represents the styles for a thumbnail field.
 */
export type TThumbnailFieldStyles = (props: TOverriddenFileItemFuncProps) => IThumbnailStyles;
/**
 * Represents a thumbnail field component.
 */
export type TThumbnailFieldComponent = (props: TOverriddenFileItemFuncProps) => ReactElement;

/**
 * Represents the styles for an input field.
 */
export type TInputFieldStyles = (props: TOverriddenFileItemFuncProps) => {
    readOnlyText?: TStyle;
    textField?: TStyle;
};
/**
 * Represents an input field component.
 */
export type TInputFieldComponent = TComponent<IInputFieldComponentProps>;

/**
 * Represents the style for a size field.
 */
export type TSizeFieldStyle = (props: TOverriddenFileItemFuncProps) => TStyle;
/**
 * Represents a size field component.
 */
export type TSizeFieldComponent = (
    props: TOverriddenFileItemFuncProps & { formatSize: TFileSizeFormatter }
) => ReactElement;

/**
 * Represents the styles for a menu in the control field.
 */
export type TControlFieldMenu = (props: TOverriddenFileItemFuncProps) => {
    /**
     * Props for the menu button.
     */
    buttonProps?: TButtonProps;
    /**
     * Children elements for the menu button.
     */
    buttonChildren?: ReactNode;
    /**
     * Styles for the menu.
     */
    menuStyles?: {
        /**
         * CSS properties for the layer behind the menu.
         */
        layer?: React.CSSProperties;
        /**
         * CSS properties for the menu.
         */
        menu?: React.CSSProperties;
    };
    /**
     * Style for the menu items.
     */
    menuItemStyle?: TStyle;
    /**
     * Customized names for menu items.
     */
    menuItemNames?: TMenuItemNames;
    /**
     * Indicates whether to display icons in the menu.
     */
    displayIcons?: boolean;
};
type TButton = { props?: TButtonProps; children?: ReactNode };
/**
 * Represents the buttons settings for a control field.
 */
export type TControlFieldButtons = (props: TOverriddenFileItemFuncProps) => {
    /**
     * Button props for uploading a file.
     */
    uploadFile?: TButton;
    /**
     * Button props for canceling file upload.
     */
    cancelUpload?: TButton;
    /**
     * Button props for removing a local file.
     */
    removeLocalFile?: TButton;
    /**
     * Button props for confirming a description.
     */
    confirmDescription?: TButton;
    /**
     * Button props for undoing a description change.
     */
    undoDescription?: TButton;
    /**
     * Loading icon element.
     */
    loadingIcon?: ReactNode;
};
/**
 * Represents the component for a control field.
 */
export type TControlFieldComponent = (
    props: TOverriddenFileItemFuncProps &
        IItemActions & {
            noKeyboard: boolean;
        }
) => ReactElement;

/**
 * Represents the customization options for the control field.
 */
export type TControlField = {
    /**
     * Represents the buttons settings.
     */
    buttons?: TControlFieldButtons;
    /**
     * Represents the styles for a menu.
     */
    menu?: TControlFieldMenu;
    /**
     * Represents the control field component.
     */
    component?: TControlFieldComponent;
};
/**
 * Represents a component for rendering a progress bar.
 */
export type TProgressBarComponent = (progress: number) => ReactElement;
/**
 * Represents a component for rendering an icon in read-only mode.
 */
export type TReadOnlyIconComponent = () => ReactElement;
/**
 * Represents a set of customizable names for menu item actions.
 */
export type TMenuItemNames = Partial<
    SameType<string, 'menuItemView' | 'menuItemDownload' | 'menuItemRename' | 'menuItemDelete'>
>;

/**
 * This type represents the available actions that can be renamed.
 */
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

/**
 * Represents a set of customizable styles for the root element of a file item.
 */
export type TFileItemRootStyles = Partial<SameType<TStyle, ExtractKeys<typeof defaultClassNames>>>;

/**
 * Represents the customization options for a file item.
 */
export interface IOverriddenFileItem {
    /**
     * Custom styles for the root element of the file item.
     */
    rootStyles?: TFileItemRootStyles;
    /**
     * Custom titles for different actions.
     */
    titles?: TTitles;

    /**
     * Custom styles for the thumbnail field.
     */
    thumbnailFieldStyles?: TThumbnailFieldStyles;
    /**
     * Custom component for the thumbnail field.
     */
    thumbnailFieldComponent?: TThumbnailFieldComponent;

    /**
     * Custom styles for the input field.
     */
    inputFieldStyles?: TInputFieldStyles;
    /**
     * Custom component for the input field.
     */
    inputFieldComponent?: TInputFieldComponent;

    /**
     * Custom style for the size field.
     */
    sizeFieldStyle?: TSizeFieldStyle;
    /**
     * Custom component for the size field.
     */
    sizeFieldComponent?: TSizeFieldComponent;

    /**
     * Customization options for the control field.
     */
    controlField?: TControlField;

    /**
     * Custom component for the progress bar.
     */
    progressBarComponent?: TProgressBarComponent;
    /**
     * Custom component for the read-only icon.
     */
    readOnlyIconComponent?: TReadOnlyIconComponent;

    /**
     * Custom component for the file item.
     */
    component?: TComponent<IFileItemComponentProps>;
}

// -----------------

/**
 * Represents the mount state of an item.
 */
export interface IItemMountState {
    /**
     * The file data of the item.
     */
    fileData: IRemoteFileData | ILocalFileData;
    /**
     * The HTML element representing the item.
     */
    element: HTMLDivElement;
    /**
     * Indicates whether the item is a local file.
     */
    isLocalFile: boolean;
    /**
     * The mount/unmount state of the item.
     */
    state?: 'mount' | 'unmount';
}

/**
 * Represents the reference object for a file item.
 */
export interface IItemRef {
    /**
     * The data of the file item.
     */
    fileData: ILocalFileData;
    /**
     * The reference to the HTML div element of the file item.
     */
    elementRef: React.RefObject<HTMLDivElement>;
    /**
     * Indicates whether the file item represents a local file.
     */
    isLocalFile: boolean;
}

/**
 * Represents the props for a file item component.
 */
export interface IFileItemProps {
    /**
     * The reference to an array of item references.
     */
    itemRefs: React.RefObject<IItemRef[]>;
    /**
     * The root element.
     */
    root: HTMLDivElement;
    /**
     * The component to render for the file item.
     */
    component: TComponent<IFileItemComponentProps>;
    /**
     * The data of the file item.
     */
    fileData: ILocalFileData;
    /**
     * The function to format the file size.
     */
    formatSize: TFileSizeFormatter;
    /**
     * The function to upload the file.
     */
    uploadFile?: (fileData: ILocalFileData) => void;
    /**
     * The function to delete the file.
     */
    deleteFile: (fileData: ILocalFileData) => void;
    /**
     * The function to download the file.
     */
    downloadFile?: (fileData: IRemoteFileData) => void;
    /**
     * The function to view the file.
     */
    viewFile?: (fileData: IRemoteFileData) => void;
    /**
     * The function to set the file description.
     */
    setFileDescription?: (fileData: ILocalFileData) => Promise<string>;
    /**
     * The function to update the file data.
     */
    updateFileData: (
        input: Partial<IRemoteFileData> | ((item: IRemoteFileData) => IRemoteFileData),
        uid: string | number
    ) => void;
    /**
     * The reference to an array of item mount states.
     */
    itemMountStates: React.RefObject<IItemMountState[]>;
    /**
     * The function to throw an error.
     */
    throwError?: TThrowError;
    /**
     * Indicates whether to show the upload progress.
     */
    showProgress: boolean;
    /**
     *  Indicates whether the file item is read-only.
     */
    readOnly: boolean;
    /**
     * Indicates whether the file item is disabled.
     */
    disabled: boolean;
    /**
     * Indicates whether the user is currently dragging files.
     */
    isDragActive: boolean;
    /**
     * Indicates whether keyboard interaction is disabled.
     */
    noKeyboard: boolean;
    /**
     * Indicates whether the file item represents a local file.
     */
    readonly isLocalFile: boolean;
}

// -----------------------------------------------------------------------------

/**
 * Represents the class names of the file item in different states.
 */
export const defaultClassNames = {
    /**
     * Base class name for the display item.
     */
    base: 'display-item',
    /**
     * Class name for the display item when it represents a local file.
     */
    local: 'display-item-local',
    /**
     * Class name for the display item when it is in the uploading state.
     */
    uploading: 'display-item-uploading',
    /**
     * Class name for the display item when it has been successfully uploaded.
     */
    uploaded: 'display-item-uploaded',
    /**
     * Class name for the display item when there is an upload error.
     */
    uploadError: 'display-item-upload-error',
    /**
     * Class name for the display item when there is a deletion error.
     */
    deletionError: 'display-item-del-error',
    /**
     * Class name for the display item in edit mode.
     */
    editMode: 'display-item-edit-mode',
    /**
     * Class name for the display item when it is in the uploaded state but disabled.
     */
    uploadedDisabled: 'display-item-uploaded-disabled',
    /**
     * Class name for the display item when it represents a local file but is disabled.
     */
    localDisabled: 'display-item-local-disabled',
};

// -----------------------------------------------------------------------------

// interface IRFC<T> {
//     (props: T): ReactElement;
// }

/**
 * Represents a file item component.
 */
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
        [
            setFileDescription,
            updateFileData,
            undoDescriptionChanges,
            fileData.uid,
            fileData.description,
        ]
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

    const getInputFieldProps = useCallback(
        () => ({
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
        }),
        [
            changeDescription,
            confirmDescriptionChanges,
            undoDescriptionChanges,
            onFocus,
            onBlur,
            textFieldId,
            fileData.fileName,
            fileData.description,
        ]
    );

    const getItemProps = useCallback(
        () => ({
            role: 'fileitem',
            ref: fileItemRef,
            id: fileData.uid,
            key: `fileItemComponent-${fileData.uid}`,
            onClick: (e: React.MouseEvent) => e.stopPropagation(),
        }),
        [fileItemRef, fileData.uid]
    );

    const getCommonProps = useCallback(
        () => ({
            root,
            formatSize,
            isLocalFile,
            showProgress,
            readOnly,
            disabled,
            isDragActive,
            noKeyboard,
        }),
        [root, formatSize, isLocalFile, showProgress, readOnly, disabled, isDragActive, noKeyboard]
    );

    const getActions = useCallback(
        () => ({
            changeDescription,
            undoDescriptionChanges,
            changeDescriptionMode,
            confirmDescriptionChanges,
            deleteFile,
            uploadFile,
            downloadFile,
            viewFile,
        }),
        [
            changeDescription,
            undoDescriptionChanges,
            changeDescriptionMode,
            confirmDescriptionChanges,
            deleteFile,
            uploadFile,
            downloadFile,
            viewFile,
        ]
    );

    return component({
        fileData,
        getInputFieldProps,
        getItemProps,
        getCommonProps,
        getActions,
    });
};
