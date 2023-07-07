import React from 'react';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles((theme) => ({
    root: {
        position: 'absolute',
        top: 0,
        left: 0,
        transform: 'rotate(-90deg)',
        transformOrigin: '50% 50%',
        pointerEvents: 'none',
        zIndex: 1,
    },
    circle: {
        transition: 'stroke-dashoffset 0.4s',
    },
}));

interface IRadialProgressProps {
    radius: number;
    stroke: number;
    size: number;
    color: string;
    progress: number;
}

const RadialProgress = (props: IRadialProgressProps) => {
    const { radius, stroke, size, color, progress } = props;

    const classes = useStyles();

    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = Number.isNaN(progress)
        ? circumference
        : circumference - (progress / 100) * circumference;

    return (
        <svg height={size} width={size} className={classes.root}>
            <circle
                stroke={color}
                fill="none"
                className={classes.circle}
                strokeDasharray={circumference + ' ' + circumference}
                strokeDashoffset={strokeDashoffset}
                strokeWidth={stroke}
                r={radius}
                cx={size / 2}
                cy={size / 2}
            />
        </svg>
    );
};

export default RadialProgress;
