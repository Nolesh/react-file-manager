import React, { useState, useRef } from 'react';

import { formatDuration } from '../Utils';

// -------------------------------------------------------------------------------------------------

export const getParentNode = (node: Node, traversalDepth?: number): Node => {
    if (!traversalDepth || traversalDepth <= 0) return node;
    else return getParentNode(node.parentNode, --traversalDepth);
};

/* istanbul ignore next */
export const stopAll = (initialNode: Node, root?: HTMLDivElement): void => {
    const host = root || (getParentNode(initialNode, 6) as HTMLElement);
    const players = host.getElementsByTagName('audio');
    for (const player of Array.from(players)) {
        player.pause();
    }
};

// We put the 'onPause' & 'onTimeUpdate' methods to the 'utils' object
// to have an ability to export it for further use in tests
export const utils: {
    onPause: () => void;
    onTimeUpdate: () => void;
} = {
    onPause: null,
    onTimeUpdate: null,
};

// -------------------------------------------------------------------------------------------------

export interface IAudioThumbnailProps {
    src: string;
    duration: number;
    type?: string;
    root?: HTMLDivElement;
    invalidAudioTitle?: string;
    styles?: {
        buttonContainer?: React.CSSProperties;
        buttonStart?: React.CSSProperties;
        buttonStop?: React.CSSProperties;
        type?: React.CSSProperties;
        duration?: React.CSSProperties;
    };
}

export const AudioThumbnail = ({
    src,
    duration,
    type,
    root,
    invalidAudioTitle,
    styles,
}: IAudioThumbnailProps): JSX.Element => {
    if (src === null || !duration || duration <= 0) {
        return <div className="type">{invalidAudioTitle || type || 'Invalid Audio'}</div>;
    }

    const [currentTime, setCurrentTime] = useState(0);
    const [state, setState] = useState<'playing' | 'stopped'>('stopped');
    const playerRef = useRef<HTMLAudioElement>();

    const play = () => {
        if (playerRef.current) {
            stopAll(playerRef.current, root);
            playerRef.current.play();
            setState('playing');
        }
    };

    const stop = () => {
        if (playerRef.current) playerRef.current.pause();
    };

    utils.onPause = () => {
        if (playerRef.current) {
            playerRef.current.currentTime = 0;
            setState('stopped');
        }
    };

    utils.onTimeUpdate = () => {
        if (playerRef.current) setCurrentTime(playerRef.current.currentTime);
    };

    return (
        <>
            <div
                role="button"
                className={`type-audio fade-in-anim`}
                onClick={() => (state === 'playing' ? stop() : play())}
                style={styles?.buttonContainer}
            >
                <audio
                    role="audio"
                    ref={playerRef}
                    src={src}
                    onPause={utils.onPause}
                    onTimeUpdate={utils.onTimeUpdate}
                />
                {state === 'stopped' ? (
                    <span
                        data-testid="play-icon"
                        className="type-audio-btn"
                        style={styles?.buttonStart}
                    >
                        &#9656;
                    </span>
                ) : (
                    <span
                        data-testid="stop-icon"
                        className="type-audio-btn type-audio-btn-stop"
                        style={styles?.buttonStop}
                    >
                        &#9724;
                    </span>
                )}
            </div>
            {type && (
                <div className="type-img" style={styles?.type}>
                    {type}
                </div>
            )}
            <div className="type-audio-duration fade-in-anim" style={styles?.duration}>
                {state === 'stopped' ? formatDuration(duration) : formatDuration(currentTime)}
            </div>
        </>
    );
};
