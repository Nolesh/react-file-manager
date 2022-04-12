if (process.env.NODE_ENV === 'test') {
    // jsdom doesn't support any loading or playback media operations. As a workaround we add a few stubs in your test setup
    // https://github.com/jsdom/jsdom/issues/2155

    window.HTMLMediaElement.prototype.load = () => {
        /* do nothing */
    };
    window.HTMLMediaElement.prototype.play = () => {
        /* do nothing */
    };
    window.HTMLMediaElement.prototype.pause = () => {
        /* do nothing */
    };
    window.HTMLMediaElement.prototype.addTextTrack = () => {
        /* do nothing */
    };

    // ----------------------------------------------------------------------

    // Mock IntersectionObserver
    // https://stackoverflow.com/questions/57008341/jest-testing-react-component-with-react-intersection-observer

    class IntersectionObserver {
        observe = jest.fn();
        unobserve = jest.fn();
        disconnect = jest.fn();
    }

    Object.defineProperty(window, 'IntersectionObserver', {
        writable: true,
        configurable: true,
        value: IntersectionObserver,
    });

    Object.defineProperty(global, 'IntersectionObserver', {
        writable: true,
        configurable: true,
        value: IntersectionObserver,
    });
}

// ----------------------------------------------------------------------
