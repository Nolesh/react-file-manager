import React, { FC, ReactElement, ReactNode } from 'react';
import { TStyle } from '../Utils/types';

import Button, { IButtonProps } from './Button';
import Menu, { MenuItem, IMenuStyles } from './Menu';

/**
 * Represents a menu item.
 */
export interface IMenuItem {
    /**
     * The name of the menu item.
     */
    name: string;
    /**
     * The action to be performed when the menu item is clicked.
     */
    action: () => void;
    /**
     * An optional icon element to be displayed alongside the menu item.
     */
    icon?: ReactElement;
}

/**
 * Represents the props for the ActionMenu component.
 */
export interface IActionMenuProps {
    /**
     * The unique identifier for the ActionMenu component.
     */
    id: string;
    /**
     * An array of menu items to be displayed in the action menu.
     */
    actions: IMenuItem[];
    /**
     * Optional props to be passed to the button component that triggers the action menu.
     */
    buttonProps?: IButtonProps;
    /**
     * Optional ReactNode to be used as the content of the button component that triggers the action menu.
     */
    buttonChildren?: ReactNode;
    /**
     * Custom styles to be applied to the menu component.
     */
    menuStyles?: IMenuStyles;
    /**
     * Custom style to be applied to each menu item.
     */
    menuItemStyle?: TStyle;
    /**
     * Specifies whether the action menu is disabled or not.
     */
    disabled?: boolean;
}

/**
 * The ActionMenu component displays a menu of actions that can be performed on an item.
 * It provides a button that, when clicked, opens the menu containing the available actions.
 */
const ActionMenu: FC<IActionMenuProps> = ({
    id,
    actions,
    buttonProps,
    buttonChildren,
    menuStyles,
    menuItemStyle,
    disabled,
}): ReactElement => {
    if (actions.length === 0 || disabled || buttonProps?.disabled)
        return (
            <Button className="icon-button" disabled>
                {buttonChildren}
            </Button>
        );

    const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);

    const handleClick = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);

    const handleClose = () => {
        if (anchorEl) anchorEl.focus();
        setAnchorEl(null);
    };

    const items = actions.map((item: IMenuItem, i: number) => (
        <MenuItem
            key={`action-${i}`}
            onClick={() => {
                handleClose();
                item.action();
            }}
            {...menuItemStyle}
        >
            {item.icon && <div className="menu-item-icon">{item.icon}</div>}
            <div className={item.icon ? 'menu-item-name' : 'menu-item-name-join'}>{item.name}</div>
        </MenuItem>
    ));

    return (
        <>
            <Button className="icon-button" onClick={handleClick} {...buttonProps}>
                {buttonChildren}
            </Button>
            <Menu
                id={`file-menu-${id}`}
                anchorEl={anchorEl}
                open={!!anchorEl}
                onClose={handleClose}
                styles={menuStyles}
            >
                {items}
            </Menu>
        </>
    );
};

export default ActionMenu;
