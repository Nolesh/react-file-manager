import React, { FC, ReactElement, useRef, useEffect } from 'react';

export interface IMenuItemProps {
    onClick?: (event: React.MouseEvent<HTMLElement>) => void;
    autoFocus?: boolean;
    [x: string]: any;
}

export const MenuItem: FC<IMenuItemProps> = ({
    children,
    onClick,
    autoFocus,
    ...rest
}): ReactElement => {
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
