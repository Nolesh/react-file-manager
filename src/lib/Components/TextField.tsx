import React, { FC, ReactElement } from 'react';

/**
 * Represents the props for a text field component.
 */
export interface ITextFieldProps {
    /**
     * The unique identifier of the text field.
     */
    id?: string;
    /**
     * The value of the text field.
     */
    value?: string;
    [prop: string]: any;
}

/**
 * TextField component.
 */
const TextField: FC<ITextFieldProps> = ({ id, value, ...rest }): ReactElement => {
    return <input className="text-field" id={id} value={value} {...rest} />;
};

export default TextField;
