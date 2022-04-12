/**
 * A simple hook that creates a portal.
 *
 * Usage:
 * const createPortal = usePortal({ id: 'portal-id' });
 * ...
 * const result = createPortal(<div>...</div>)
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface IPortal {
    (props: { element?: string; [x: string]: any }): (
        children: React.ReactNode
    ) => React.ReactElement;
}

export const usePortal: IPortal = ({ element = 'div', ...rest } = {}) => {
    const [container] = useState<HTMLElement>(() => {
        const el = document.createElement(element);
        el.setAttribute('role', 'portalcontainer');
        Object.entries(rest).forEach((prop) => {
            const [key, value] = prop;
            el.setAttribute(key, value);
        });
        return el;
    });

    useEffect(() => {
        document.body.appendChild(container);
        return () => {
            document.body.removeChild(container);
        };
    }, []);

    return (children) => container && createPortal(children, container);
};
