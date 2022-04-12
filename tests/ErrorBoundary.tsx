// https://reactjs.org/docs/error-boundaries.html
// https://react-typescript-cheatsheet.netlify.app/docs/basic/getting-started/error_boundaries/
/*
test('Error Boundary', () => {
    let error: Error = null;

    const ThrowError = () => {
      throw Error('Test');
    };

    render(
      <ErrorBoundary
        fallback={<div data-testid="errorboundary" />}
        getError={err => (error = err)}
      >
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('errorboundary')).toBeVisible();
    expect(error.message).toBe("Test")
});
*/

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    getError?: (error: Error) => void;
}

interface State {
    hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
    consoleMock: jest.SpyInstance;

    constructor(props: Props) {
        super(props);
        this.consoleMock = jest.spyOn(console, 'error').mockImplementation();
    }

    // public componentDidMount(){
    //     this.consoleMock = jest.spyOn(console, 'error').mockImplementation();
    // }

    // public componentWillUnmount(){
    //     this.consoleMock.mockRestore();
    // }

    public state: State = {
        hasError: false,
    };

    public static getDerivedStateFromError(_: Error): State {
        // Update state so the next render will show the fallback UI.
        return {
            hasError: true,
        };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // console.error("Uncaught error:", error, errorInfo);
        if (this.props.getError) this.props.getError(error);
        this.consoleMock.mockRestore();
    }

    public render() {
        if (this.state.hasError) {
            return (
                this.props.fallback || <h1 data-testid="errorboundary">Something went wrong!</h1>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
