import React from 'react';

import '@testing-library/jest-dom';
import { act, render, fireEvent, waitFor, screen } from '@testing-library/react';

import { ImageLazyLoader, IImageLazyLoaderProps } from '../../src/lib/Components';

// import * as component from '../../src/lib/Components/AudioThumbnail';

// const observe = jest.fn((element) => console.log('observe', element));
// const unobserve = jest.fn((element) => console.log('unobserve', element));

// beforeAll(() => {
//     // @ts-ignore
//     window.IntersectionObserver = jest.fn(() => ({
//       observe,
//       unobserve,
//     }))
// })

// let observer: any = null;

// beforeAll(() => {
//     observer = window.IntersectionObserver;
// });
//
// afterAll(() => {
//     window.IntersectionObserver = observer;
// })

beforeEach(() => {
    window.IntersectionObserver = undefined;
});

const onLoad = jest.fn();

const Loader = (props: Omit<IImageLazyLoaderProps, 'children'>) => {
    const child = <img src={null} onLoad={onLoad} className="imgClass" />;

    return <ImageLazyLoader {...props}>{child}</ImageLazyLoader>;
};

describe('ImageLazyLoader', () => {
    test('should throw error due to invalid child', async () => {
        jest.spyOn(console, 'error').mockImplementation(() => {});

        const loaderRenderer = () =>
            render(
                <ImageLazyLoader>
                    <audio />
                </ImageLazyLoader>
            );

        expect(loaderRenderer).toThrow(
            Error('Invalid child type. ImageLazyLoader expected to receive a child with image type')
        );
    });

    test('should call observe & unobserve', async () => {
        // hides 'Intersection Observer is not supported by this browser' message
        jest.spyOn(console, 'info').mockImplementation(() => {});

        const observe = jest.fn();
        const unobserve = jest.fn();

        // @ts-ignore
        window.IntersectionObserver = jest.fn(() => ({
            observe,
            unobserve,
        }));

        // --------------------------------------------

        const { getByRole, queryByRole, unmount } = render(<Loader />);

        expect(getByRole('imagelazyloader')).toBeInTheDocument();
        expect(queryByRole('img')).toBeNull();
        expect(observe).toHaveBeenCalled();

        unmount();

        expect(queryByRole('imagelazyloader')).toBeNull();
        expect(unobserve).toHaveBeenCalled();
    });

    test('should simulate image loading process', async () => {
        const { getByRole, getByText } = render(
            <Loader
                placeholder={<div>Placeholder</div>}
                styles={{
                    container: { className: 'image-lazy-loader' },
                    image: {
                        loading: { className: 'loading' },
                        loaded: { className: 'loaded' },
                    },
                }}
            />
        );

        const container = getByRole('imagelazyloader');
        const img = getByRole('img');
        const placeholder = getByText('Placeholder');

        expect(container).toBeInTheDocument();
        expect(container).toHaveClass('image-lazy-loader');
        expect(placeholder).toBeInTheDocument();
        expect(img).toBeInTheDocument();
        expect(img).toHaveClass('imgClass');
        expect(img).toHaveClass('loading');

        fireEvent.load(img);

        expect(onLoad).toHaveBeenCalled();
        expect(placeholder).not.toBeInTheDocument();
        expect(img).toBeInTheDocument();
        expect(img).toHaveClass('imgClass');
        expect(img).toHaveClass('loaded');
    });

    test('should test styles', async () => {
        const { rerender, getByRole, getByText } = render(
            <Loader
                styles={{
                    image: {
                        loading: { style: { color: 'yellow' } },
                        loaded: { style: { color: 'green' } },
                    },
                }}
            />
        );

        let img = getByRole('img');
        expect(img).toHaveStyle('color: yellow;');
        fireEvent.load(img);
        expect(img).toHaveStyle('color: green;');

        rerender(<Loader />);

        // screen.debug();

        img = getByRole('img');
        expect(img).not.toHaveStyle('');
    });
});
