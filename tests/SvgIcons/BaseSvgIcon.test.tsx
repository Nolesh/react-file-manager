import React from 'react';

import '@testing-library/jest-dom';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';

import { BaseSvgIcon, IBaseSvgIconProps } from '../../src/lib/SvgIcons/BaseSvgIcon';

describe('BaseSvgIcon', () => {
    test('should render BaseSvgIcon component with default className', () => {
        const { container } = render(<BaseSvgIcon />);

        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
        expect(svg).toHaveClass('svg-icon');
    });

    test('should have a child', () => {
        const { container } = render(
            <BaseSvgIcon>
                <a />
            </BaseSvgIcon>
        );

        const svg = container.querySelector('svg');
        expect(svg.querySelector('a')).not.toBeNull();
    });

    test('should have custom className and other props', () => {
        const { container } = render(
            <BaseSvgIcon className="customClass" style={{ color: 'red' }}></BaseSvgIcon>
        );

        const svg = container.querySelector('svg');
        expect(svg).toHaveClass('customClass');
        expect(svg).toHaveStyle('color:red');
    });
});
