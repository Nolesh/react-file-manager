import React from 'react';

import '@testing-library/jest-dom';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';

import { TextField } from '../../src/lib/Components';

describe('TextField', () => {
    test('should render component', () => {
        render(<TextField />);
        expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    test('should render value', () => {
        const onChange = jest.fn();
        render(<TextField value="test value" onChange={onChange} />);

        expect(screen.getByRole('textbox')).toHaveValue('test value');
        expect(onChange).toBeCalledTimes(0);
    });

    test('should allow entering a value', () => {
        const onChange = jest.fn();
        render(<TextField onChange={onChange} />);

        const textField = screen.getByRole('textbox');
        fireEvent.change(textField, { target: { value: 'test' } });
        // screen.debug();

        expect(screen.getByRole('textbox')).toHaveValue('test');
        expect(onChange).toBeCalledTimes(1);
    });

    test('should have default className', () => {
        render(<TextField />);

        const textField = screen.getByRole('textbox');
        expect(textField).toHaveClass('text-field');
    });

    test('should have passed properties', () => {
        render(<TextField className="styled-textfield" title="test title" />);

        const textField = screen.getByRole('textbox');
        expect(textField).toHaveClass('styled-textfield');
        expect(textField).toHaveAttribute('title', 'test title');
    });
});
