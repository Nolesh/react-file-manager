import React, { FC, ReactElement } from 'react';

import { BaseSvgIcon, IBaseSvgIconProps } from './BaseSvgIcon';

export interface ISvgIconProps extends IBaseSvgIconProps {
    path: string;
}

export const SvgIcon: FC<ISvgIconProps> = ({ path, ...rest }): ReactElement => {
    if (!path) {
        throw Error("Invalid 'path' property. SvgIcon expected to receive a valid 'path' property");
    }

    return (
        <BaseSvgIcon {...rest}>
            <path d={path} />
        </BaseSvgIcon>
    );
};
