import React from 'react';

import '@testing-library/jest-dom';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';

import { MenuItem } from '../../src/lib/Components';

describe('MenuItem', () => {
    test('should render component', () => {
        render(<MenuItem />);

        const mi = screen.getByRole('menuitem');
        expect(mi).toBeInTheDocument();
    });

    test('should render children', () => {
        render(<MenuItem>Title</MenuItem>);

        const child = screen.getByText('Title');
        expect(child).toBeInTheDocument();
    });

    test('should fire click event', () => {
        const onClick = jest.fn();
        render(<MenuItem onClick={onClick} />);

        const mi = screen.getByRole('menuitem');
        fireEvent.click(mi);

        expect(onClick).toBeCalledTimes(1);
    });

    test('should be focused on item2', async () => {
        const { getAllByRole } = render(
            <ul>
                <MenuItem>test1</MenuItem>
                <MenuItem autoFocus>test2</MenuItem>
            </ul>
        );

        waitFor(() => expect(getAllByRole('menuitem')[1]).toHaveFocus());
    });
});
