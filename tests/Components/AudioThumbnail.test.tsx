import React, { useRef } from 'react';

import '@testing-library/jest-dom';
import { act, render, fireEvent, waitFor, screen } from '@testing-library/react';

import * as component from '../../src/lib/Components/AudioThumbnail';
const { AudioThumbnail } = component;

let spyStopAll: any = null;

beforeAll(() => {
    spyStopAll = jest.spyOn(component, 'stopAll');
    spyStopAll.mockImplementation(() => {
        // console.log('stopAll');
    });

    window.HTMLMediaElement.prototype.pause = function () {
        // console.log('mock HTMLMediaElement pause functionality');
        component.utils.onPause();
    };

    // window.HTMLMediaElement.prototype.addEventListener('timeupdate', () => { console.log('mock HTMLMediaElement pause functionality'); })
});

afterAll(() => {
    spyStopAll.mockRestore();
});

const execAction = jest.fn();

const Thumbnail = (
    props: Omit<component.IAudioThumbnailProps, 'id' | 'src' | 'duration' | 'type'>
) => {
    return (
        <AudioThumbnail
            src={'data:audio/wav;base64,'}
            duration={121}
            type="MPEG"
            // root={root}
            {...props}
        />
    );
};

describe('AudioThumbnail', () => {
    test('should render only type (test)', () => {
        // <button onClick={() => new Audio(Array(40).join('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU')).play()}>Beep</button>
        // const button = getByRole('button');
        // act(() => {
        //     button.click()
        // })

        const { getByText } = render(<AudioThumbnail duration={0} src={null} type={'test'} />);

        expect(getByText('test')).toBeInTheDocument();
    });

    test('should render default invalid text', () => {
        const { getByText } = render(<AudioThumbnail duration={0} src={null} type={null} />);

        expect(getByText('Invalid Audio')).toBeInTheDocument();
    });

    test('should render custom invalid text', () => {
        const { getByText } = render(
            <AudioThumbnail
                duration={120}
                src={null}
                type={'mpeg'}
                invalidAudioTitle="test title"
            />
        );

        expect(getByText('test title')).toBeInTheDocument();
    });

    test('should render a valid component', () => {
        const { container, getByTestId, getByText, getByRole } = render(<Thumbnail />);

        expect(getByRole('button')).toBeInTheDocument();
        expect(getByRole('audio')).toBeInTheDocument();
        // expect(container.querySelector('.type-audio-btn')).toBeInTheDocument();
        expect(getByTestId('play-icon')).toBeInTheDocument();
        expect(getByText('MPEG')).toBeInTheDocument();
        expect(getByText('02:01')).toBeInTheDocument();
    });

    test('test play/stop button functionality', async () => {
        const { container, getByTestId, getByText, getByRole } = render(<Thumbnail />);

        expect(getByTestId('play-icon')).toBeInTheDocument();
        expect(getByText('02:01')).toBeInTheDocument();

        const button = getByRole('button');

        // press play
        act(() => {
            button.click();
        });

        // expect(container.querySelector('.type-audio-btn-stop')).toBeInTheDocument();
        expect(getByTestId('stop-icon')).toBeInTheDocument();
        expect(getByText('00:00')).toBeInTheDocument();
        expect(spyStopAll).toBeCalledTimes(1);

        // press stop
        act(() => {
            button.click();
        });

        expect(getByTestId('play-icon')).toBeInTheDocument();
        expect(getByText('02:01')).toBeInTheDocument();
        expect(spyStopAll).toBeCalledTimes(1);
    });

    test('should update the time while playing audio', async () => {
        const { container, getByTestId, getByText, getByRole } = render(<Thumbnail />);

        expect(getByTestId('play-icon')).toBeInTheDocument();
        expect(getByText('02:01')).toBeInTheDocument();

        const button = getByRole('button');
        const audio = getByRole('audio') as HTMLAudioElement;

        // press play
        act(() => {
            button.click();
        });

        expect(getByTestId('stop-icon')).toBeInTheDocument();
        expect(getByText('00:00')).toBeInTheDocument();
        expect(spyStopAll).toBeCalledTimes(1);

        act(() => {
            audio.currentTime = 5;
            component.utils.onTimeUpdate();
        });

        expect(getByText('00:05')).toBeInTheDocument();

        act(() => {
            audio.currentTime = 72;
            component.utils.onTimeUpdate();
        });

        expect(getByText('01:12')).toBeInTheDocument();

        // press stop
        act(() => {
            button.click();
            component.utils.onTimeUpdate();
        });

        expect(getByText('02:01')).toBeInTheDocument();

        // press play
        act(() => {
            button.click();
        });

        expect(getByText('00:00')).toBeInTheDocument();
        expect(spyStopAll).toBeCalledTimes(2);
    });

    test('should test getParentNode function', () => {
        let targetRef: React.RefObject<HTMLDivElement>;

        const Component = () => {
            const ref = useRef();
            targetRef = ref;

            return (
                <div name="level1">
                    <div name="level2">
                        <div name="level3">
                            <div name="target" ref={ref}></div>
                        </div>
                    </div>
                </div>
            );
        };

        render(<Component />);

        expect(
            (component.getParentNode(targetRef.current) as HTMLElement).getAttribute('name')
        ).toBe('target');
        expect(
            (component.getParentNode(targetRef.current, 1) as HTMLElement).getAttribute('name')
        ).toBe('level3');
        expect(
            (component.getParentNode(targetRef.current, 2) as HTMLElement).getAttribute('name')
        ).toBe('level2');
        expect(
            (component.getParentNode(targetRef.current, 3) as HTMLElement).getAttribute('name')
        ).toBe('level1');
    });
});
