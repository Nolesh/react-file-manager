import React, { FC, ReactElement, useRef, useEffect } from 'react';

/**
 * Props for a menu item component.
 */
export interface IMenuItemProps {
    /**
     * Event handler for the click event.
     * @param event The click event object.
     */
    onClick?: (event: React.MouseEvent<HTMLElement>) => void;
    /**
     * Specifies whether the menu item should be auto-focused.
     */
    autoFocus?: boolean;
    [x: string]: any;
}

/**
 * The MenuItem component represents an item within a menu.
 */
const MenuItem: FC<IMenuItemProps> = ({ children, onClick, autoFocus, ...rest }): ReactElement => {
    const menuItemRef = useRef(null);

    useEffect(() => {
        if (autoFocus && menuItemRef.current) {
            menuItemRef.current.focus();
        }
    }, [autoFocus]);

    return (
        <div
            role="menuitem"
            ref={menuItemRef}
            className={'menu-item'}
            onClick={(!!onClick && ((e) => onClick(e))) || null}
            {...rest}
        >
            {children}
        </div>
    );
};

export default MenuItem;
