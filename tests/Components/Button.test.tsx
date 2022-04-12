import React from 'react';

import '@testing-library/jest-dom';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';

import { Button } from '../../src/lib/Components';

describe('Button', () => {
    test('should render component', () => {
        render(<Button />);
        expect(screen.getByRole('button')).toBeInTheDocument();
    });

    test('should render children', () => {
        const { rerender } = render(<Button>Title</Button>);
        expect(screen.getByText('Title')).toBeInTheDocument();

        rerender(
            <Button>
                <div>Child</div>
            </Button>
        );
        expect(screen.getByRole('button').innerHTML).toBe('<div>Child</div>');
    });

    test('should have a className', () => {
        render(<Button className="styled-button">Title</Button>);
        const btn = screen.getByRole('button');
        expect(btn).toHaveClass('styled-button');
    });

    test('should fire click', () => {
        const onClick = jest.fn();
        render(<Button onClick={onClick}>Title</Button>);

        const btn = screen.getByRole('button');
        fireEvent.click(btn);

        expect(onClick).toBeCalledTimes(1);
    });
});
