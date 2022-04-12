import React, { FC, ReactElement, useRef, useEffect, useLayoutEffect, useState } from 'react';

import { MenuItem, IMenuItemProps } from './MenuItem';
import { usePortal } from '../Utils/PortalHook';

const getScrollbarWidth = () => window.innerWidth - document.documentElement.clientWidth;

function nextItem(list: Node, item: Element) {
    if (list === item) return list.firstChild;
    if (item && item.nextElementSibling) return item.nextElementSibling;
    return list.firstChild;
}

function previousItem(list: Node, item: Element) {
    if (list === item) return list.lastChild;
    if (item && item.previousElementSibling) return item.previousElementSibling;
    return list.lastChild;
}

function moveFocus(
    list: Node,
    currentFocus: Element,
    traversalFunction: (list: Node, item: Element) => ChildNode
) {
    const nextFocus = traversalFunction(list, currentFocus);
    if (nextFocus) (nextFocus as HTMLElement).focus();
}

// -------------------------------------------------------------------------------------------------

export interface IMenuStyles {
    layer?: React.CSSProperties;
    menu?: React.CSSProperties;
}

export interface IMenuProps {
    id: string;
    anchorEl: HTMLElement;
    open: boolean;
    onClose?: (e: MouseEvent | KeyboardEvent) => void;
    styles?: IMenuStyles;
}

interface IRestoreStyleProperty {
    property: string;
    el: HTMLElement;
    value: string;
}

export const Menu: FC<IMenuProps> = ({
    children,
    id,
    anchorEl,
    open,
    onClose,
    styles,
    ...rest
}): ReactElement => {
    const createPortal = usePortal({ id, class: 'react-file-manager' });

    const menuLayerRef = useRef<HTMLDivElement>();
    const menuRef = useRef<HTMLDivElement>();

    const bodyStyle = useRef<IRestoreStyleProperty[]>([]);

    const [items, setItems] = useState<React.ReactNode>();
    const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

    const restoreBodyStyle = () => {
        bodyStyle.current.forEach(({ value, el, property }) => {
            if (value) {
                el.style.setProperty(property, value);
            } else {
                el.style.removeProperty(property);
            }
        });
    };

    const saveBodyStyle = () => {
        bodyStyle.current.push(
            {
                value: document.body.style.paddingRight,
                property: 'padding-right',
                el: document.body,
            },
            {
                value: document.body.style.overflow,
                property: 'overflow',
                el: document.body,
            },
            {
                value: document.body.style.overflowX,
                property: 'overflow-x',
                el: document.body,
            },
            {
                value: document.body.style.overflowY,
                property: 'overflow-y',
                el: document.body,
            }
        );
    };

    const handleClose = (e: MouseEvent | KeyboardEvent) => {
        if (menuRef.current && onClose) onClose(e);
    };

    const handleKeyDown = (event: React.KeyboardEvent) => {
        // console.log('onKeyDown', event.key)
        const menu = menuRef.current;

        const { key } = event;
        const currentFocus = menu.ownerDocument.activeElement;

        if (key === 'Escape' || key === 'Tab') {
            event.preventDefault();
            handleClose(event.nativeEvent);
        } else if (key === 'ArrowDown') {
            // Prevent scroll of the page
            event.preventDefault();
            moveFocus(menu, currentFocus, nextItem);
        } else if (key === 'ArrowUp') {
            event.preventDefault();
            moveFocus(menu, currentFocus, previousItem);
        } else if (key === ' ' || key === 'Enter') {
            event.preventDefault();
            (currentFocus as HTMLElement).click();
        }
    };

    const toggleMenu = (anchorEl: HTMLElement) => {
        // Removes the scrollbar from the document and positions the menu window
        if (open) {
            const scrollbarWidth = getScrollbarWidth();

            document.body.style.overflow = 'hidden';
            document.body.style.paddingRight = scrollbarWidth + 'px';

            const menuWidth = menuRef.current.offsetWidth;
            const menuHeight = menuRef.current.offsetHeight;
            let { top, left, width, height } = anchorEl?.getBoundingClientRect() ?? {
                top: 0,
                left: 0,
                width: 0,
                height: 0,
            };
            if (top + menuHeight > window.innerHeight) top = top - menuHeight + height;
            if (left + menuWidth > window.innerWidth) left = left - menuWidth + width;
            setPosition({ top: top, left: left });
        } else restoreBodyStyle();

        // Toggle menu visibility
        if (open) menuRef.current.style.visibility = 'visible';
        else
            window.setTimeout(() =>
                menuRef.current ? (menuRef.current.style.visibility = 'hidden') : null
            );

        // Set focus to the first menu item
        let activeItemIndex = -1;
        const items = !open
            ? children
            : React.Children.map(children, (child, index) => {
                  if (!React.isValidElement(child)) return null;

                  const newChildProps: any = {};
                  if (!child.props.disabled && activeItemIndex === -1) {
                      activeItemIndex = index;
                      newChildProps.autoFocus = true;
                      newChildProps.tabIndex = 0;
                  } else newChildProps.tabIndex = -1;

                  return React.cloneElement(child, newChildProps);
              });

        setItems(items);
    };

    useLayoutEffect(() => {
        saveBodyStyle();
        menuRef.current.style.visibility = 'hidden';

        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLDivElement;
            if (!menuRef.current.contains(target)) handleClose(e);
        };

        menuLayerRef.current.addEventListener('click', handleClick);
        return () => {
            menuLayerRef.current.removeEventListener('click', handleClick);
            restoreBodyStyle();
        };
    }, []);

    useEffect(() => toggleMenu(anchorEl), [anchorEl, open, children]);

    const offset = 0;

    const menuStyle: React.CSSProperties = {
        ...styles?.menu,
        top: position.top + offset,
        left: position.left + offset,
    };

    return createPortal(
        <>
            <div
                role="layer"
                ref={menuLayerRef}
                className={`menu-layer${open ? ' menu-layer-visible' : ''}`}
                style={open ? styles?.layer : null}
            ></div>
            <div
                role="menu"
                ref={menuRef}
                onKeyDown={handleKeyDown}
                className={`menu ${open ? 'menu-visible' : 'menu-hidden'}`}
                style={menuStyle}
                {...rest}
            >
                {items}
            </div>
        </>
    );
};

export { IMenuItemProps, MenuItem };
