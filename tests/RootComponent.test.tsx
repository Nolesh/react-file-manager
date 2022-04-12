import React from 'react';

import '@testing-library/jest-dom';
import { act, render, fireEvent, within } from '@testing-library/react';

import { localStorageImpl } from './MockData';
import { SameType } from '../src/lib/Utils/types';
import {
    RootComponent,
    IRootComponentProps,
    IRootEventProps,
    IOverriddenRoot,
} from '../src/lib/RootComponent';

const onClick = jest.fn();
const onKeyDown = jest.fn();
const onDragEnter = jest.fn();
const onDragOver = jest.fn();
const onDragLeave = jest.fn();
const onDrop = jest.fn();

const sortFiles = jest.fn();
const update = jest.fn();

let rootRef: React.RefObject<HTMLDivElement>;

interface IProps
    extends SameType<
        boolean,
        | 'isDragActive'
        | 'isDragReject'
        | 'isFocused'
        | 'disabled'
        | 'isLoading'
        | 'isUploading'
        | 'readOnly'
    > {
    tabIndex: number;
}

const Root = (
    props: Partial<
        IProps & { overrides: Omit<IOverriddenRoot, 'component'> } & { fileItems: JSX.Element[] }
    >
) => {
    rootRef = React.useRef<HTMLDivElement>();

    const getEventProps: () => IRootEventProps = () => ({
        onClick,
        onKeyDown,
        onDragEnter,
        onDragOver,
        onDragLeave,
        onDrop,
    });

    let { overrides, fileItems, ...rest } = props;

    if (!fileItems) fileItems = [];

    const defaultProps = {
        isDragActive: false,
        isDragReject: false,
        isFocused: false,
        disabled: false,
        isLoading: false,
        isUploading: false,
        readOnly: false,
        tabIndex: 0,
        ...rest,
    };

    const args: IRootComponentProps = {
        componentRef: rootRef,
        getEventProps,
        sortFiles,
        update,
        fileItems,
        ...defaultProps,
    };

    return <RootComponent {...{ ...args, overrides }} />;
};

const genFileItems = () => {
    const fileItems: JSX.Element[] = [1, 2, 3].map((x, i) => {
        return <div key={i}>{`file${x}`}</div>;
    });
    return fileItems;
};

describe('RootComponent', () => {
    test('should render component', () => {
        const { getByRole, getByTestId } = render(<Root />);

        const root = getByRole('root');
        const dropZoneContainer = getByTestId('drop-zone-container');
        const header = getByRole('header');
        const colType = getByTestId('column-type');
        const colName = getByTestId('column-name');
        const colSize = getByTestId('column-size');
        const colSort = getByTestId('column-sort-file-mode');
        const label = getByTestId('label');

        expect(root).toBeInTheDocument();
        expect(dropZoneContainer).toBeInTheDocument();
        expect(header).toBeInTheDocument();
        expect(colType).toBeInTheDocument();
        expect(colName).toBeInTheDocument();
        expect(colSize).toBeInTheDocument();
        expect(colSort).toBeInTheDocument();
        expect(label).toBeInTheDocument();

        expect(root).toContainElement(dropZoneContainer);
        expect(dropZoneContainer).toContainElement(header);
        expect(header).toContainElement(colType);
        expect(header).toContainElement(colName);
        expect(header).toContainElement(colSize);
        expect(header).toContainElement(colSort);
        expect(dropZoneContainer).toContainElement(label);

        // expect(within(header).queryByTestId('column-type')).not.toBeNull();
    });

    test('should test header', async () => {
        const { rerender, getByRole, getByTestId, queryByRole } = render(<Root />);

        const root = getByRole('root');
        const dropZoneContainer = getByTestId('drop-zone-container');
        const header = getByRole('header');
        const label = getByTestId('label');

        expect(root).toBeInTheDocument();
        expect(dropZoneContainer).toBeInTheDocument();
        expect(header).toBeInTheDocument();
        expect(label).toBeInTheDocument();

        // test type column
        expect(getByTestId('column-type')).toHaveAttribute('data-order', 'asc');
        fireEvent.click(getByTestId('column-type'));
        expect(getByTestId('column-type')).toHaveAttribute('data-order', 'desc');

        // test name column
        expect(getByTestId('column-name')).toHaveAttribute('data-order', 'asc');
        fireEvent.click(getByTestId('column-name'));
        expect(getByTestId('column-name')).toHaveAttribute('data-order', 'desc');

        // test size column
        expect(getByTestId('column-size')).toHaveAttribute('data-order', 'asc');
        fireEvent.click(getByTestId('column-size'));
        expect(getByTestId('column-size')).toHaveAttribute('data-order', 'desc');

        // test sort file mode column
        const { methods } = localStorageImpl.register(); // mock localStorage

        const sign1 = getByTestId('column-sort-file-mode').innerHTML;
        fireEvent.click(getByTestId('column-sort-file-mode'));
        rerender(<Root />);
        const sign2 = getByTestId('column-sort-file-mode').innerHTML;
        fireEvent.click(getByTestId('column-sort-file-mode'));
        rerender(<Root />);
        const sign3 = getByTestId('column-sort-file-mode').innerHTML;
        fireEvent.click(getByTestId('column-sort-file-mode'));
        rerender(<Root />);
        const sign4 = getByTestId('column-sort-file-mode').innerHTML;

        expect(sign1).not.toEqual(sign2);
        expect(sign2).not.toEqual(sign3);
        expect(sign3).not.toEqual(sign4);
        expect(sign1).toEqual(sign4);

        expect(methods.setItem).toBeCalledTimes(3);

        localStorageImpl.unregister();

        // check disabled state
        const {
            methods: { setItem },
        } = localStorageImpl.register(); // mock localStorage
        rerender(<Root disabled />);
        fireEvent.click(getByTestId('column-size'));
        expect(getByTestId('column-size')).toHaveAttribute('data-order', 'desc');
        fireEvent.click(getByTestId('column-sort-file-mode'));
        expect(setItem).not.toHaveBeenCalled();

        localStorageImpl.unregister();

        // hide header
        rerender(<Root overrides={{ hideHeader: true }} />);
        expect(queryByRole('header')).toBeNull();
    });

    test('should render file items', async () => {
        const { getByRole, getByTestId, queryByTestId } = render(
            <Root fileItems={genFileItems()} />
        );

        const root = getByRole('root');
        const dropZoneContainer = getByTestId('drop-zone-container');
        const fileContainer = getByTestId('file-container');

        expect(root).toBeInTheDocument();
        expect(dropZoneContainer).toBeInTheDocument();
        expect(fileContainer).toBeInTheDocument();
        expect(queryByTestId('label')).toBeNull();
    });

    test('should call events', async () => {
        const { rerender, getByRole, getByTestId } = render(
            <Root overrides={{ hideHeader: true }} />
        );

        const root = getByRole('root');

        //  drag & drop events
        fireEvent.dragEnter(root);
        expect(onDragEnter).toHaveBeenCalled();

        fireEvent.dragOver(root);
        expect(onDragOver).toHaveBeenCalled();

        fireEvent.dragLeave(root);
        expect(onDragLeave).toHaveBeenCalled();

        fireEvent.drop(root);
        expect(onDrop).toHaveBeenCalled();

        // rest events
        fireEvent.click(root);
        expect(onClick).toHaveBeenCalled();

        fireEvent.keyDown(root);
        expect(onKeyDown).toHaveBeenCalled();

        expect(sortFiles).not.toHaveBeenCalled();
        rerender(<Root />);
        expect(sortFiles).toBeCalledTimes(1);

        fireEvent.click(getByTestId('column-type'));
        expect(update).toBeCalledTimes(1);

        fireEvent.click(getByTestId('column-name'));
        expect(update).toBeCalledTimes(2);

        fireEvent.click(getByTestId('column-size'));
        expect(update).toBeCalledTimes(3);

        fireEvent.click(getByTestId('column-sort-file-mode'));
        expect(update).toBeCalledTimes(4);
    });

    test('should test various behaviour', async () => {
        const { rerender, getByRole, getByTestId, getByText } = render(<Root />);

        const root = getByRole('root');
        const header = getByRole('header');
        const label = getByTestId('label');

        expect(label).toBeInTheDocument();
        expect(header).toBeInTheDocument();

        // change default text
        rerender(<Root overrides={{ hideHeader: true, texts: { defaultText: 'test text' } }} />);
        expect(getByText('test text')).toBeInTheDocument();

        // set custom class to the root & header
        rerender(
            <Root
                overrides={{ classNames: { dropZone: 'dropZoneClass', header: 'headerClass' } }}
            />
        );
        expect(root).toHaveClass('dropZoneClass');
        expect(root).not.toHaveClass('drop-zone-disabled');
        expect(getByRole('header')).toHaveClass('headerClass');

        // set tabIndex to the root and disable component
        rerender(
            <Root tabIndex={1} disabled overrides={{ classNames: { dropZone: 'dropZoneClass' } }} />
        );
        expect(root).toHaveAttribute('tabIndex', '1');
        expect(root).toHaveClass('dropZoneClass');
        expect(root).toHaveClass('drop-zone-disabled');

        rerender(<Root isDragActive overrides={{ texts: { dragActiveAccept: 'accept' } }} />);
        expect(root).toHaveClass('drop-zone-active-accept');
        expect(getByTestId('drop-zone-container')).toHaveStyle('min-height: 100%;');
        expect(getByTestId('cover')).toBeInTheDocument();
        expect(getByTestId('label')).toBeInTheDocument();
        expect(within(getByTestId('label')).getByText('accept')).not.toBeNull();

        rerender(
            <Root isDragActive isDragReject overrides={{ texts: { dragActiveReject: 'reject' } }} />
        );
        expect(root).toHaveClass('drop-zone-active-reject');
        expect(getByTestId('cover')).toBeInTheDocument();
        expect(getByTestId('label')).toBeInTheDocument();
        expect(within(getByTestId('label')).getByText('reject')).not.toBeNull();

        rerender(<Root isLoading overrides={{ texts: { loading: 'loading' } }} />);
        expect(getByTestId('drop-zone-container')).toHaveStyle('min-height: 100%;');
        expect(getByTestId('cover')).toBeInTheDocument();
        expect(getByTestId('label')).toBeInTheDocument();
        expect(within(getByTestId('label')).getByText('loading')).not.toBeNull();
    });

    test('should test footer', async () => {
        jest.useFakeTimers(); // mock timers

        const items = genFileItems();
        const { rerender, getByRole, queryByRole, getByText, getByTestId } = render(
            <Root fileItems={items} />
        );

        const root = getByRole('root');

        jest.spyOn(root, 'clientHeight', 'get').mockImplementation(() => 70);
        jest.spyOn(root, 'scrollHeight', 'get').mockImplementation(() => 100);

        // const { scrollHeight , clientHeight  } = rootRef.current;
        // console.log(scrollHeight ,clientHeight, scrollHeight > clientHeight)

        act(() => {
            jest.runAllTimers(); // trigger setTimeout
        });

        expect(getByRole('footer')).toBeInTheDocument();

        rerender(<Root fileItems={items} overrides={{ hideFooter: true }} />);
        expect(queryByRole('footer')).toBeNull();

        rerender(<Root fileItems={items} isDragActive />);
        expect(queryByRole('footer')).toBeNull();
        expect(getByTestId('cover')).toBeInTheDocument();
        expect(getByTestId('label')).toBeInTheDocument();

        rerender(<Root fileItems={items} isLoading />);
        expect(queryByRole('footer')).toBeNull();

        rerender(
            <Root
                fileItems={items}
                overrides={{
                    classNames: { footer: 'footerClass' },
                    texts: { footer: 'footer text' },
                }}
            />
        );

        act(() => {
            jest.runAllTimers(); // trigger setTimeout
        });

        const footer = getByRole('footer');
        expect(footer).toBeInTheDocument();
        expect(footer).toHaveClass('footerClass');
        expect(within(footer).getByText('footer text')).not.toBeNull();

        // screen.debug()
    });
});
