import React, { FC, ReactElement } from 'react';

export interface IBaseSvgIconProps {
    [x: string]: unknown;
}

export const BaseSvgIcon: FC<IBaseSvgIconProps> = ({ children, ...rest }): ReactElement => {
    return (
        <svg className="svg-icon" {...rest}>
            {children}
        </svg>
    );
};
