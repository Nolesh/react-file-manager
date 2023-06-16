import React, { FC, ReactElement } from 'react';

/**
 * Represents the props for a button component.
 */
export interface IButtonProps {
    /**
     * Function to handle the click event of the button.
     */
    onClick?: (event: React.MouseEvent<HTMLElement>) => void;
    /**
     * Indicates whether the button is disabled or not.
     */
    disabled?: boolean;
    [prop: string]: any;
}

/**
 * Button component.
 */
const Button: FC<IButtonProps> = ({ children, onClick, ...rest }): ReactElement => {
    return (
        <button
            onClick={(!!onClick && ((e) => (e.stopPropagation(), onClick(e)))) || null}
            {...rest}
        >
            {children}
        </button>
    );
};

export default Button;
