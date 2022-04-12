import React, { FC, ReactElement, ReactNode } from 'react';
import { TStyle } from '../Utils/types';

import { Button, IButtonProps } from './Button';
import { Menu, MenuItem, IMenuStyles } from './Menu';

export interface IMenuItem {
    name: string;
    action: () => void;
    icon?: ReactElement;
}

export interface IActionMenuProps {
    id: string;
    actions: IMenuItem[];
    buttonProps?: IButtonProps;
    buttonChildren?: ReactNode;
    menuStyles?: IMenuStyles;
    menuItemStyle?: TStyle;
    disabled?: boolean;
}

export const ActionMenu: FC<IActionMenuProps> = ({
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
