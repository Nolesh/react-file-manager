import React, { FC, ReactElement } from 'react';

export interface ITextFieldProps {
    id?: string;
    value?: string;
    [prop: string]: any;
}

export const TextField: FC<ITextFieldProps> = ({ id, value, ...rest }): ReactElement => {
    return <input className="text-field" id={id} value={value} {...rest} />;
};
