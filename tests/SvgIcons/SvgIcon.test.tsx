import React from 'react';

import '@testing-library/jest-dom';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';

import { SvgIcon, ISvgIconProps } from '../../src/lib/SvgIcons/SvgIcon';

describe('SvgIcon', () => {
    test('should throw an error when "path" prop is not provided', () => {
        jest.spyOn(console, 'error').mockImplementation(() => {});

        // @ts-ignore
        const svgRenderer = () => render(<SvgIcon />);

        expect(svgRenderer).toThrow(
            Error("Invalid 'path' property. SvgIcon expected to receive a valid 'path' property")
        );
    });

    test('should render SvgIcon component with "path" prop as a child', () => {
        const { container } = render(<SvgIcon path="M5 20h14v-2H5v2zm0-10h4v6h6v-6h4l-7-7-7 7z" />);

        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
        expect(svg.querySelector('path')).not.toBeNull();

        // screen.debug();
    });
});
