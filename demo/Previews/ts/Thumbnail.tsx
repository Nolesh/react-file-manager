import React, { useRef, useState } from 'react';

import { CircularProgress } from '@material-ui/core';

import '../styles.scss';
import { IFileData, TThumbnailFieldComponent } from '../../../src/lib';

const formatDuration = (sec: number) => (
    (sec = sec ? sec : 0), new Date(sec * 1000).toISOString().substr(11, 8)
);

const VideoThumbnail = ({
    src,
    duration,
    videoWidth,
    videoHeight,
}: IFileData['previewData']): React.ReactNode => {
    return (
        <>
            <video
                width="60"
                height="60"
                muted
                playsInline
                src={src}
                onContextMenu={(e) => {
                    e.preventDefault();
                }}
            />
            <div className="video-meta video-meta-header">
                {videoWidth}x{videoHeight}
            </div>
            <div className="video-meta video-meta-footer">{formatDuration(duration)}</div>
        </>
    );
};

const AudioThumbnail = ({ uid, src, duration }: { uid: string; src: string; duration: number }) => {
    const [currentTime, setCurrentTime] = useState(duration);
    const [state, setState] = useState<'playing' | 'paused'>('paused');
    const playerRef = useRef<HTMLAudioElement>();

    const containerStyle: React.CSSProperties = {
        cursor: 'pointer',
        background: '#ffffff55',
        borderRadius: '50%',
        width: 32,
        height: 32,
        marginLeft: 6,
    };

    const buttonStyle: React.CSSProperties = {
        position: 'absolute',
        fontSize: 19,
        top: 6,
        marginLeft: -7,
    };

    const play = () => {
        if (playerRef.current) {
            playerRef.current.play();
            setState('playing');
        }
    };

    const pause = () => {
        if (playerRef.current) {
            playerRef.current.pause();
            setState('paused');
        }
    };

    const onTimeUpdate = () => {
        if (playerRef.current) setCurrentTime(playerRef.current.currentTime);
    };

    return (
        <>
            <div style={containerStyle} onClick={() => (state === 'playing' ? pause() : play())}>
                <audio
                    ref={playerRef}
                    id={`audio-${uid}`}
                    src={src}
                    onEnded={() => {
                        setState('paused');
                        setCurrentTime(duration);
                    }}
                    onTimeUpdate={onTimeUpdate}
                />
                {state === 'paused' ? (
                    <span style={buttonStyle}>&#9654;</span>
                ) : (
                    <span style={{ ...buttonStyle, ...{ marginLeft: -7, top: 5 } }}>| |</span>
                )}
            </div>
            <div style={{ fontSize: 12, marginTop: 5 }}>{formatDuration(currentTime)}</div>
        </>
    );
};

const CustomFileItemThumbnail: TThumbnailFieldComponent = ({ fileData, readOnly, disabled }) => {
    const type =
        fileData.fileType ||
        fileData?.file?.type?.split('/')?.pop()?.toUpperCase() ||
        (fileData.fileName.split('.').length > 1
            ? fileData.fileName.split('.').pop().toUpperCase()
            : '?');

    const opacity = readOnly || disabled ? 0.35 : 1;

    return (
        <div>
            {fileData.previewData && !fileData.previewData.src ? (
                <CircularProgress style={{ color: 'white' }} />
            ) : fileData?.previewData?.tag === 'video' && fileData.previewData?.src ? (
                VideoThumbnail(fileData.previewData)
            ) : fileData.file?.type?.startsWith('audio/') && fileData.previewData?.src ? (
                <AudioThumbnail
                    uid={fileData.uid}
                    src={fileData.previewData.src}
                    duration={fileData.previewData.duration}
                />
            ) : (
                (!!fileData?.previewData?.src && (
                    <img
                        src={fileData.previewData.src}
                        style={{ opacity, maxWidth: 60, maxHeight: 60, border: '1px solid #555' }}
                    />
                )) || (
                    <div
                        style={{
                            fontSize: 14,
                            fontWeight: 'bold',
                            padding: 5,
                            border: '1px solid black',
                        }}
                    >
                        {type}
                    </div>
                )
            )}
        </div>
    );
};

export default CustomFileItemThumbnail;
