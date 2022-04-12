/* istanbul ignore file */

import { useEffect, RefObject } from 'react';

let observer: IntersectionObserver;
let observables: Element[] = [];
const listenerCallbacks = new WeakMap();

function handleIntersections(entries: IntersectionObserverEntry[]) {
    entries.forEach((entry) => {
        if (listenerCallbacks.has(entry.target)) {
            if (entry.isIntersecting || entry.intersectionRatio > 0) {
                const callback = listenerCallbacks.get(entry.target);
                listenerCallbacks.delete(entry.target);
                observer.unobserve(entry.target);
                observables = observables.filter((item) => item !== entry.target);
                cleanUp();
                callback();
            }
        }
    });
}

function getIntersectionObserver(
    options: IntersectionObserverInit = {
        threshold: 0.1,
    }
) {
    if (!observer) {
        observer = new IntersectionObserver(handleIntersections, options);
    }
    return observer;
}

function cleanUp() {
    if (!observables.length) observer = null;
}

export function useIntersection(
    callback: () => void,
    element: RefObject<HTMLElement>,
    options?: IntersectionObserverInit
) {
    useEffect(() => {
        if (typeof IntersectionObserver === 'undefined') {
            console.info('Intersection Observer is not supported by this browser');
            callback();
            return undefined;
        }

        const target = element.current;
        listenerCallbacks.set(target, callback);
        const mObserver = getIntersectionObserver(options);
        mObserver.observe(target);
        observables.push(target);

        return () => {
            if (!!!observables.find((item) => item === target)) return;

            listenerCallbacks.delete(target);
            mObserver.unobserve(target);

            observables = observables.filter((item) => item !== target);
            cleanUp();
        };
    }, []);
}
