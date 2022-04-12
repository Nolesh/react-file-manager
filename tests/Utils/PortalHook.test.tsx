import React from 'react';

import '@testing-library/jest-dom';
import { render, within } from '@testing-library/react';

import { usePortal } from '../../src/lib/Utils/PortalHook';

const Component = (props: { args?: Parameters<typeof usePortal>[0]; content: React.ReactNode }) => {
    // const {createPortal} = usePortal(props.args);
    const createPortal = usePortal(props.args);

    return (
        <div data-testid="level1">
            Level1
            <div data-testid="level2">
                Level2
                {createPortal(props.content)}
            </div>
        </div>
    );
};

describe('Portal Hook', () => {
    test('should render the portal with default params', () => {
        const { getByRole, getByTestId } = render(
            <Component content={<span data-testid="content">content</span>} />
        );

        expect(within(getByTestId('level2')).queryByRole('portalcontainer')).toBeNull();
        expect(getByRole('portalcontainer').parentNode).toEqual(document.body);
        expect(getByRole('portalcontainer').nodeName).toEqual('DIV');
        expect(within(getByRole('portalcontainer')).queryByTestId('content')).not.toBeNull();
    });

    test('should set parent portal element to span element', () => {
        const { getByRole, getByTestId } = render(
            <Component
                content={<span data-testid="content">content</span>}
                args={{ element: 'span' }}
            />
        );

        expect(getByRole('portalcontainer').nodeName).toEqual('SPAN');
        expect(getByRole('portalcontainer').parentNode).toEqual(document.body);
        expect(within(getByRole('portalcontainer')).queryByTestId('content')).not.toBeNull();
    });

    test('should set custom attribute on parent portal element', () => {
        //
        const { getByRole, getByTestId } = render(
            <Component
                content={<span data-testid="content">content</span>}
                args={{ 'custom-attr': 'myAttribute' }}
            />
        );

        expect(getByRole('portalcontainer').getAttribute('custom-attr')).toEqual('myAttribute');
    });
});
