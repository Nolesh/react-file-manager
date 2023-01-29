import './app.scss';

import { CustomRootComponent } from './CustomRootComponent';
import {
    CustomFileItemRootStyles,
    CustomFileItemNameStyles,
    CustomFileItemSizeStyle,
    CustomActionMenuProps,
    CustomButtonsProps,
    CustomProgressBar,
    CustomReadOnlyIcon,
    CustomFileItemNameComponent,
    CustomFileItemThumbnailComponent,
    CustomFileItemThumbnailStyles,
    CustomTitles,
    CustomFileItemSizeComponent,
    CustomControlComponent,
} from './CustomFileItem';
import { MaterialFileItemRenderer } from './MaterialFileItemRenderer';
import CustomFileItemRenderer from './CustomFileItemRenderer';
import { IOverriddenFileItem, IOverriddenRoot, TOverrides } from '../../lib';

const OverriddenRoot: IOverriddenRoot = {
    // All options are independent and optional.
    // hideHeader: true,
    // hideFooter: true,
    texts: {
        // headerFileType: 'Type',
        // headerFileName: 'Name',
        // headerFileSize: 'Size',
        // footer: 'Click here to open file selector',
        // dragActiveAccept: 'Drop your file(s)',
        dragActiveReject: 'Some files will NOT be accepted',
        loading: 'Loading...',
        defaultText:
            'Drag & drop you file(s) here\nor click on the footer or empty area to open file selector',
        defaultTextDisabled: 'File manager is disabled',
    },
    // classNames: {
    //     dropZone: 'drop-zone-custom',
    //     activeAccept: 'drop-zone-active-accept-custom',
    //     activeReject: 'drop-zone-active-reject-custom',
    //     header: 'drop-zone-header-custom',
    //     footer: 'drop-zone-footer-custom',
    // },
    styles: {
        // dropZone: {width: 460, height: 250, overflowY: 'scroll'},
        // header: { background: '#3f52b5', color: 'white' },
        // footer: { background: '#3f52b5', color: 'white' },
        // header: { fontFamily: 'century gothic' },
        // dropZone: { fontFamily: 'century gothic' },
    },
    // component: CustomRootComponent, // Overrides all options above (Root)!
};

const OverridenFileItem: IOverriddenFileItem = {
    // All options are independent and optional.
    // titles: {
    //     menuButtonTitle: 'File actions',
    //     menuItemView: 'View',
    //     menuItemDownload: 'Download',
    //     menuItemRename: 'Rename',
    //     menuItemDelete: 'Delete',
    // },
    titles: CustomTitles,

    rootStyles: CustomFileItemRootStyles,

    thumbnailFieldStyles: CustomFileItemThumbnailStyles,
    // thumbnailFieldComponent: CustomFileItemThumbnailComponent,

    // inputFieldStyles: CustomFileItemNameStyles,
    inputFieldComponent: CustomFileItemNameComponent,

    // sizeFieldStyle: CustomFileItemSizeStyle,
    sizeFieldComponent: CustomFileItemSizeComponent,

    controlField: {
        buttons: CustomButtonsProps,
        menu: CustomActionMenuProps,
        component: CustomControlComponent,
    },

    progressBarComponent: CustomProgressBar,
    // readOnlyIconComponent: CustomReadOnlyIcon,

    // component: MaterialFileItemRenderer, // Overrides all options above (FileItem)!
    // component: CustomFileItemRenderer, // Overrides all options above (FileItem)!
};

export const overrides: TOverrides = {
    // uidGenerator: () => `uid-${new Date().getTime()}-${Math.random()*100}`, // uncomment to override the default implementation
    // fileSizeFormatter: (size) => `${size.toLocaleString()} B`, // uncomment to override the default implementation
    Root: OverriddenRoot,
    FileItem: OverridenFileItem,
};
