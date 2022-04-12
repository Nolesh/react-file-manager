// https://github.com/mui-org/material-ui/blob/814fb60bbd8e500517b2307b6a297a638838ca89/packages/material-ui/test/integration/Menu.test.js#L98-L108
import React, { useRef } from 'react';

import '@testing-library/jest-dom';
import { act, render, fireEvent, waitFor, screen } from '@testing-library/react';

import { Menu, IMenuProps, MenuItem } from '../../src/lib/Components';

const onCloseMenu = jest.fn();
const onClickItem = jest.fn();

const generateItems = (itemArray: number[]) =>
    itemArray.map((i) => (
        <MenuItem key={`action-${i}`} onClick={onClickItem}>
            {`item${i}`}
        </MenuItem>
    ));

const MenuComponent = ({
    open = false,
    itemArray = [1, 2, 3],
    anchorEl,
    ...rest
}: Partial<
    Omit<IMenuProps, 'id' | 'anchorEl'> & { itemArray: number[]; anchorEl?: HTMLElement }
>) => {
    const items = generateItems(itemArray);

    return (
        <Menu
            id="menuId"
            anchorEl={anchorEl || document.body}
            open={open}
            onClose={onCloseMenu}
            {...rest}
        >
            {items}
        </Menu>
    );
};

describe('Menu', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.clearAllTimers();
    });

    test('is part of the DOM by default but hidden', () => {
        const { getByRole } = render(<MenuComponent />);

        const menu = getByRole('menu', { hidden: true });

        expect(menu).toBeInTheDocument();
        expect(menu).not.toBeVisible();
    });

    test('does not gain any focus when mounted', () => {
        const { getByRole } = render(<MenuComponent />);

        const menu = getByRole('menu', { hidden: true });
        expect(menu).not.toContain(document.activeElement);
    });

    test('should focus the first item on open', () => {
        const { getByRole, getAllByRole } = render(<MenuComponent open />);

        const menu = getByRole('menu');
        expect(menu).toBeVisible();

        expect(getAllByRole('menuitem')[0]).toHaveFocus();
    });

    test('should support null children', () => {
        const items = generateItems([1, 2]);

        const { getAllByRole } = render(
            <Menu id="menuId" anchorEl={document.body} open>
                {items}
                {null}
            </Menu>
        );

        expect(getAllByRole('menuitem').length).toBe(2);
    });

    test('should toggle menu visibility', () => {
        const { rerender, getByRole } = render(<MenuComponent open />);

        const menu = getByRole('menu');
        expect(menu).toBeVisible();

        rerender(<MenuComponent />);
        jest.runAllTimers();

        expect(menu).not.toBeVisible();
    });

    test('should recalculate the position of the menu if it goes outside the window', () => {
        const sizes = {
            anchorTop: 150,
            anchorLeft: 250,
            anchorWidth: 200,
            anchorHeight: 100,
            menuWidth: 200,
            menuHeight: 300,
            windowWidth: 400,
            windowHeight: 400,
        };

        // Set custom window size
        global.innerWidth = sizes.windowWidth;
        global.innerHeight = sizes.windowHeight;

        // Mock getBoundingClientRect
        Element.prototype.getBoundingClientRect = jest.fn(() => {
            return {
                width: sizes.anchorWidth,
                height: sizes.anchorHeight,
                top: sizes.anchorTop,
                left: sizes.anchorLeft,
                bottom: 0,
                right: 0,
            } as any;
        });

        // Save original offsetWidth & offsetHeight
        const originalOffsetHeight = Object.getOwnPropertyDescriptor(
            HTMLElement.prototype,
            'offsetHeight'
        );
        const originalOffsetWidth = Object.getOwnPropertyDescriptor(
            HTMLElement.prototype,
            'offsetWidth'
        );

        // Set custom offsetWidth & offsetHeight
        Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
            configurable: true,
            value: sizes.menuWidth,
        });
        Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
            configurable: true,
            value: sizes.menuHeight,
        });

        const Component = ({ open = false }: { open?: boolean }) => {
            const anchor = useRef();

            return (
                <div>
                    <button ref={anchor}>Anchor</button>
                    <Menu id="menuId" anchorEl={anchor.current} open={open}></Menu>
                </div>
            );
        };

        const { rerender, getByRole } = render(<Component />);
        rerender(<Component open />);

        const top = sizes.anchorTop - sizes.menuHeight + sizes.anchorHeight;
        const left = sizes.anchorLeft - sizes.menuWidth + sizes.anchorWidth;
        expect(getByRole('menu')).toHaveStyle(`top: ${top}px; left: ${left}px;`);

        // Restore offsetWidth & offsetHeight
        Object.defineProperty(HTMLElement.prototype, 'offsetHeight', originalOffsetHeight);
        Object.defineProperty(HTMLElement.prototype, 'offsetWidth', originalOffsetWidth);
    });

    test('should show menu even if anchor is null', () => {
        const { rerender, getByRole, queryByRole } = render(
            <Menu id="menuId" anchorEl={null} open></Menu>
        );

        expect(getByRole('menu')).toHaveStyle(`top: 0px; left: 0px;`);
    });

    test('should set specific right padding and hidden overflow to the body on open and then restore the body style', () => {
        document.body.style.paddingLeft = '20px';
        document.body.style.paddingRight = '1%';

        const pattern1 = /padding-left: 20px; padding-right: 1%;/;
        const pattern2 = /padding-left: 20px; padding-right: \d*px; overflow: hidden;/;

        // open menu
        const { rerender, unmount } = render(<MenuComponent open />);
        expect(document.body.style.cssText).toMatch(pattern2);

        // rerender in opened state
        rerender(<MenuComponent open />);
        expect(document.body.style.cssText).toMatch(pattern2);

        // close menu
        rerender(<MenuComponent />);
        expect(document.body.style.cssText).toMatch(pattern1);

        // open again
        rerender(<MenuComponent open />);
        expect(document.body.style.cssText).toMatch(pattern2);

        unmount();
        expect(document.body.style.cssText).toMatch(pattern1);
    });

    test('should change focus according to keyboard navigation', () => {
        const { rerender, getAllByRole, getByRole } = render(<MenuComponent open />);

        const menuItems = getAllByRole('menuitem');

        fireEvent.keyDown(menuItems[0], { key: 'ArrowDown' });
        expect(menuItems[1]).toHaveFocus();

        fireEvent.keyDown(menuItems[1], { key: 'ArrowUp' });
        expect(menuItems[0]).toHaveFocus();

        fireEvent.keyDown(menuItems[0], { key: 'ArrowUp' });
        expect(menuItems[2]).toHaveFocus();

        fireEvent.keyDown(menuItems[2], { key: 'ArrowRight' });
        expect(menuItems[2]).toHaveFocus();

        fireEvent.keyDown(menuItems[2], { key: 'ArrowDown' });
        expect(menuItems[0]).toHaveFocus();
    });

    test('should change focus from menu to menu item when navigating with keyboard', () => {
        const { getAllByRole, getByRole } = render(<MenuComponent open tabIndex={0} />);

        const menu = getByRole('menu');
        const menuItems = getAllByRole('menuitem');

        // Object.defineProperty(menu.ownerDocument, 'activeElement', { writable: true, value: menu });
        menu.focus();
        expect(menu).toHaveFocus();

        fireEvent.keyDown(menu, { key: 'ArrowDown' });
        expect(menuItems[0]).toHaveFocus();

        menu.focus();
        expect(menu).toHaveFocus();

        fireEvent.keyDown(menu, { key: 'ArrowUp' });
        expect(menuItems[2]).toHaveFocus();
    });

    test('should call various events according to keyboard', async () => {
        const { getAllByRole } = render(<MenuComponent open />);

        const menuItems = getAllByRole('menuitem');
        // -------------------------------------------------

        fireEvent.keyDown(menuItems[0], { key: 'Tab' });
        expect(onCloseMenu).toBeCalledTimes(1);
        // -------------------------------------------------

        fireEvent.keyDown(menuItems[0], { key: 'Escape' });
        expect(onCloseMenu).toBeCalledTimes(2);
        // -------------------------------------------------

        fireEvent.keyDown(menuItems[0], { key: ' ' });
        expect(onClickItem).toBeCalledTimes(1);
        // -------------------------------------------------

        fireEvent.keyDown(menuItems[0], { key: 'Enter' });
        expect(onClickItem).toBeCalledTimes(2);
    });

    test('should call various events according to mouse', async () => {
        const { getAllByRole, getByRole } = render(<MenuComponent open />);

        const menuItems = getAllByRole('menuitem');
        act(() => {
            menuItems[0].click();
        });

        expect(onClickItem).toBeCalledTimes(1);

        // -------------------------------------------------

        act(() => {
            getByRole('layer').click();
        });

        expect(onCloseMenu).toBeCalledTimes(1);
    });

    test('should change focus according to keyboard navigation', () => {
        const { rerender, getAllByRole, getByRole } = render(<MenuComponent open />);

        const menuItems = getAllByRole('menuitem');

        fireEvent.keyDown(menuItems[0], { key: 'ArrowDown' });
        expect(menuItems[1]).toHaveFocus();

        fireEvent.keyDown(menuItems[1], { key: 'ArrowUp' });
        expect(menuItems[0]).toHaveFocus();

        fireEvent.keyDown(menuItems[0], { key: 'ArrowUp' });
        expect(menuItems[2]).toHaveFocus();

        fireEvent.keyDown(menuItems[2], { key: 'ArrowRight' });
        expect(menuItems[2]).toHaveFocus();

        fireEvent.keyDown(menuItems[2], { key: 'ArrowDown' });
        expect(menuItems[0]).toHaveFocus();
    });
});
