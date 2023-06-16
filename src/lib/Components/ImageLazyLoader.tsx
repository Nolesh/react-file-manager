import React, { useRef, useState } from 'react';

import { useIntersection } from '../Utils/IntersectionObserverHook';
import { composeEventHandlers } from '../Utils';
import { TStyle } from '../Utils/types';

/**
 * Represents the props for an image lazy loader component.
 */
export interface IImageLazyLoaderProps {
    /**
     * The placeholder element to be shown while the image is loading.
     */
    placeholder?: React.ReactElement;
    /**
     * Custom styles for the image lazy loader component.
     */
    styles?: {
        container?: TStyle;
        image?: {
            loading?: TStyle;
            loaded?: TStyle;
        };
    };
    /**
     * Options for the IntersectionObserver used for lazy loading.
     */
    options?: IntersectionObserverInit;
    /**
     * The child element which is the actual image element to be lazy loaded.
     */
    children: React.ReactElement<HTMLImageElement>;
}

/**
 * Represents the functional component for an image lazy loader.
 */
export interface IImageLazyLoader {
    (props: IImageLazyLoaderProps): React.ReactElement;
}

const addNewPropsToElement = (element: React.ReactElement, props: Record<string, any>) => {
    Object.keys(props).forEach((key) => {
        const originalProp = element.props[key];

        if (typeof originalProp === 'function') {
            props[key] = composeEventHandlers(props[key], originalProp);
        }

        if (key === 'className') {
            props[key] = `${originalProp ? originalProp + ' ' : ''}${props[key]}`;
        }

        if (key === 'style') {
            props[key] = { ...originalProp, ...props[key] };
        }
    });

    const modChild = React.cloneElement(element, props);
    return modChild;
};

/**
 * The ImageLazyLoader component is used to lazy load images in a web application.
 * It renders a placeholder element while the image is loading, and once the image is in view, it replaces the placeholder with the actual image.
 */
const ImageLazyLoader: IImageLazyLoader = ({ placeholder = null, styles, options, children }) => {
    const [isInView, setIsInView] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const containerRef = useRef();

    useIntersection(
        () => {
            setIsInView(true);
        },
        containerRef,
        options
    );

    const handleOnLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        // e.stopPropagation(); // Prevents calling the onLoad function defined in the element
        setIsLoaded(true);
    };

    const child = React.Children.only(children);
    if (!React.isValidElement(child) || child.type !== 'img')
        throw Error(
            'Invalid child type. ImageLazyLoader expected to receive a child with image type'
        );

    const image = addNewPropsToElement(child, {
        onLoad: handleOnLoad,
        ...(isLoaded ? styles?.image?.loaded : styles?.image?.loading),
    });

    return (
        <div role="imagelazyloader" ref={containerRef} {...styles?.container}>
            {!isInView ? null : (
                <>
                    {!isLoaded && placeholder}
                    {image}
                </>
            )}
        </div>
    );
};

export default ImageLazyLoader;
