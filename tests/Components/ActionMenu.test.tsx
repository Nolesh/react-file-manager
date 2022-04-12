import React from 'react';

import '@testing-library/jest-dom';
import { act, render, fireEvent, waitFor, screen, within } from '@testing-library/react';

import { ActionMenu, IMenuItem, IActionMenuProps } from '../../src/lib/Components';

const execAction = jest.fn();

const ButtonMenu = (props: Partial<Omit<IActionMenuProps, 'id'>>) => {
    const actions: IMenuItem[] = [
        {
            action: execAction,
            name: 'test action 1',
        },
        {
            action: () => {},
            name: 'test action 2',
        },
        {
            action: () => {},
            name: 'test action 3',
        },
    ];

    return <ActionMenu id="221" actions={actions} data-testid="ActionMenu" {...props} />;
};

describe('ActionMenu', () => {
    test('if there is no actions, show only disabled button', () => {
        const { getByRole } = render(<ActionMenu id="btn-menu" actions={[]} />);

        const button = getByRole('button');

        expect(button).toBeDisabled();
        expect(button).toBeInTheDocument();
    });

    test('button should be disabled and has a text', () => {
        const { rerender, getByRole } = render(
            <ButtonMenu buttonProps={{ disabled: true }} buttonChildren="test" />
        );

        let button = getByRole('button');
        expect(button).toBeDisabled();
        expect(button.innerHTML).toBe('test');

        rerender(<ButtonMenu disabled />);
        button = getByRole('button');
        expect(button).toBeDisabled();
    });

    test('does not gain any focus when mounted', () => {
        const { getByRole } = render(<ButtonMenu />);

        const menu = getByRole('menu', { hidden: true });
        expect(menu).not.toContain(document.activeElement);
    });

    test('should have three menu items', () => {
        const { getByRole, getAllByRole } = render(<ButtonMenu />);

        expect(getAllByRole('menuitem', { hidden: true }).length).toEqual(3);
    });

    test('should override default menu', async () => {
        const actions: IMenuItem[] = [
            {
                action: execAction,
                name: 'action1',
                icon: <div>icon1</div>,
            },
            {
                action: () => {},
                name: 'action2',
                icon: <div>icon2</div>,
            },
        ];

        const { rerender, getAllByRole, getByRole } = render(
            <ButtonMenu
                actions={actions}
                menuItemStyle={{ className: 'menu-item-test-class' }}
                menuStyles={{
                    layer: { background: 'red' },
                    menu: { background: 'green' },
                }}
            />
        );

        const button = getByRole('button');
        act(() => {
            button.click();
        });

        expect(getAllByRole('menuitem').length).toEqual(2);
        expect(getByRole('layer')).toHaveStyle('background: red;');
        expect(getByRole('menu')).toHaveStyle('background: green;');

        const menuItems = getAllByRole('menuitem');
        expect(within(menuItems[0]).getByText('icon1')).not.toBeNull();
        expect(within(menuItems[0]).getByText('action1')).not.toBeNull();
        expect(within(menuItems[1]).getByText('icon2')).not.toBeNull();
        expect(within(menuItems[1]).getByText('action2')).not.toBeNull();

        rerender(
            <ButtonMenu
                actions={[
                    {
                        action: execAction,
                        name: 'action1',
                    },
                ]}
            />
        );

        expect(within(getByRole('menuitem')).queryByText('icon1')).toBeNull();
    });

    test('should focus the first item on open', () => {
        const { getByRole, getAllByRole } = render(<ButtonMenu />);

        // screen.debug();

        const button = getByRole('button');

        act(() => {
            button.focus();
            button.click();
        });

        expect(getAllByRole('menuitem')[0]).toHaveFocus();
    });

    test('should change focus according to keyboard navigation', () => {
        const { getAllByRole, getByRole } = render(<ButtonMenu />);

        const button = getByRole('button');
        act(() => {
            button.focus();
            button.click();
        });
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

    test('should call various events according to keyboard', async () => {
        const { getAllByRole, getByRole, debug } = render(<ButtonMenu />);

        const button = getByRole('button');
        const menu = getByRole('menu', { hidden: true });

        // -------------------------------------------------
        act(() => {
            button.focus();
            button.click();
        });

        expect(menu).toBeVisible();

        let menuItems = getAllByRole('menuitem');
        fireEvent.keyDown(menuItems[0], { key: 'Tab' });

        // await new Promise((r) => setTimeout(r, 0))
        await waitFor(() => expect(menu).not.toBeVisible());

        // -------------------------------------------------
        act(() => {
            button.click();
        });

        expect(menu).toBeVisible();

        menuItems = getAllByRole('menuitem');
        fireEvent.keyDown(menuItems[0], { key: 'Escape' });
        await waitFor(() => expect(menu).not.toBeVisible());

        // -------------------------------------------------
        act(() => {
            button.click();
        });

        expect(menu).toBeVisible();

        menuItems = getAllByRole('menuitem');
        fireEvent.keyDown(menuItems[0], { key: ' ' });
        await waitFor(() => expect(menu).not.toBeVisible());
        expect(execAction).toBeCalledTimes(1);

        // -------------------------------------------------
        act(() => {
            button.click();
        });

        expect(menu).toBeVisible();

        menuItems = getAllByRole('menuitem');
        fireEvent.keyDown(menuItems[0], { key: 'Enter' });
        await waitFor(() => expect(menu).not.toBeVisible());
        expect(execAction).toBeCalledTimes(2);
    });

    test('should call various events according to mouse', async () => {
        const { getAllByRole, getByRole, debug } = render(<ButtonMenu />);

        const button = getByRole('button');
        act(() => {
            button.focus();
            button.click();
        });

        const menu = getByRole('menu');
        expect(menu).toBeVisible();

        const menuItems = getAllByRole('menuitem');
        act(() => {
            menuItems[0].click();
        });

        expect(execAction).toBeCalledTimes(1);
        await waitFor(() => expect(menu).not.toBeVisible());

        // -------------------------------------------------
        act(() => {
            button.click();
        });

        expect(menu).toBeVisible();
        act(() => {
            getByRole('layer').click();
        });

        expect(execAction).toBeCalledTimes(1);
        await waitFor(() => expect(menu).not.toBeVisible());
    });
});
