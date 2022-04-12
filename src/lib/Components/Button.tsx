import React, { FC, ReactElement } from 'react';

export interface IButtonProps {
    onClick?: (event: React.MouseEvent<HTMLElement>) => void;
    disabled?: boolean;
    [prop: string]: any;
}

export const Button: FC<IButtonProps> = ({ children, onClick, ...rest }): ReactElement => {
    return (
        <button
            onClick={(!!onClick && ((e) => (e.stopPropagation(), onClick(e)))) || null}
            {...rest}
        >
            {children}
        </button>
    );
};
