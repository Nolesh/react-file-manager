import React from 'react';

import '@testing-library/jest-dom';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';

import { createEventWithFiles, mockFile } from '../MockData';

import * as Utils from '../../src/lib/Utils';
import { makeQueryablePromise, safePromise } from '../../src/lib/Utils';

type TCase = (string | number | boolean)[];

describe('Miscellaneous functions', () => {
    describe('test formatDuration function', () => {
        const cases: TCase[] = [
            [0, '00:00'],
            [1, '00:01'],
            [12, '00:12'],
            [72, '01:12'],
            [700, '11:40'],
            [3600, '01:00:00'],
            [3661, '01:01:01'],
        ];
        test.each<TCase>(cases)('given %p as argument, returns %p', (arg, expectedResult) => {
            expect(Utils.formatDuration(arg as number)).toBe(expectedResult);
        });
    });

    describe('test formatSize function', () => {
        const cases: TCase[] = [
            [1024, '1.0 kB'],
            [95 * 1024, '95 kB'],
            [2 * 1024 * 1024, '2.0 MB'],
            [3 * 1024 * 1024 * 1024, '3.0 GB'],
        ];
        test.each<TCase>(cases)('given %p as argument, returns %p', (arg, expectedResult) => {
            expect(Utils.formatSize(arg as number)).toBe(expectedResult);
        });
    });

    describe('test accepts function', () => {
        const cases: TCase[] = [
            ['', true],
            ['*', true],
            ['.txt', true],
            ['.png,.txt', true],
            ['.png', false],
            ['image/*', false],
            ['plain/txt', true],
            ['plain/*', true],
            ['txts', false],
            ['txt', false],
        ];
        const file = mockFile();

        test('should test file name & file size', () => {
            expect(file.name).toBe('mock.txt');
            expect(file.size).toBe(1024);
        });

        test.each<TCase>(cases)('given %p as argument, returns %p', (arg, expectedResult) => {
            expect(Utils.accepts(file, arg as string)).toBe(expectedResult);
        });

        expect(Utils.accepts(new File([], 'folder', { type: '' }), '.png')).toBe(true);
    });

    test('test guid function', () => {
        expect(Utils.guid()).toMatch(
            /^[A-z0-9]{8}-[A-z0-9]{4}-[A-z0-9]{4}-[A-z0-9]{4}-[A-z0-9]{12}/
        ); //0b28e777-9996-4505-f15b-96072212eee3
    });

    test('test safePromise function', async () => {
        const prom = new Promise(() => {});
        expect(safePromise(prom)).toBeInstanceOf(Promise);

        const [result] = await safePromise(Promise.resolve(1));
        expect(result).toBe(1);

        const [, err] = await safePromise(Promise.reject('err'));
        expect(err).toBe('err');

        const [, unknownErr] = await safePromise(Promise.reject());
        expect(unknownErr).toBe('unknown error');
    });

    test('test makeQueryablePromise function', async () => {
        const promSuccess = new Promise<string>((resolve) => {
            resolve('test');
        });
        const wrappedPromSuccess = makeQueryablePromise(promSuccess);

        expect(wrappedPromSuccess).toBeInstanceOf(Promise);
        expect(makeQueryablePromise(wrappedPromSuccess)).toEqual(wrappedPromSuccess);

        expect(wrappedPromSuccess.isPending()).toBe(true);
        expect(wrappedPromSuccess.isFulfilled()).toBe(false);
        expect(wrappedPromSuccess.isRejected()).toBe(false);

        const result = await wrappedPromSuccess;

        expect(result).toBe('test');
        expect(wrappedPromSuccess.isPending()).toBe(false);
        expect(wrappedPromSuccess.isFulfilled()).toBe(true);
        expect(wrappedPromSuccess.isRejected()).toBe(false);

        const promFail = new Promise<string>((_, reject) => {
            reject('err');
        });

        const wrappedPromFail = makeQueryablePromise(promFail);

        try {
            await wrappedPromFail;
        } catch (e) {
            expect(e).toBe('err');
        }
    });

    test('test isEventWithFiles function', () => {
        const file = mockFile('ping.json', 10 * 1024, 'application/json');
        let event = createEventWithFiles([file]) as unknown as React.DragEvent;
        expect(Utils.isEventWithFiles(event)).toBe(true);

        event = new Event(null, { bubbles: true }) as unknown as React.DragEvent;
        Object.defineProperty(event, 'target', {
            writable: false,
            value: { files: { item: null, length: 1 } },
        });
        expect(Utils.isEventWithFiles(event)).toBe(true);

        event = new Event(null, { bubbles: true }) as unknown as React.DragEvent;
        expect(Utils.isEventWithFiles(event)).toBe(false);

        const dt = {
            files: [] as any,
            items: [
                {
                    kind: 'file',
                    type: file.type,
                    getAsFile: () => null as any,
                },
            ],
            types: ['application/x-moz-file'],
        } as any;
        event.dataTransfer = dt;

        expect(Utils.isEventWithFiles(event)).toBe(true);
    });

    test('test isDragReject function', () => {
        let event = new Event(null, { bubbles: true }) as unknown as React.DragEvent<HTMLElement>;
        expect(Utils.isDragReject(event, '*')).toBe(false);

        const file = mockFile();
        event = createEventWithFiles([file]) as unknown as React.DragEvent<HTMLElement>;
        expect(Utils.isDragReject(event, 'image/*')).toBe(true);
        expect(Utils.isDragReject(event, 'audio/*')).toBe(true);
        expect(Utils.isDragReject(event, 'plain/*')).toBe(false);
    });

    test('test composeEventHandlers function', () => {
        const event = new Event(null, { bubbles: true }); //as unknown as React.SyntheticEvent;

        const func1Call = jest.fn();
        const func2Call = jest.fn();
        const func3Call = jest.fn();

        const func1 = (e: React.SyntheticEvent<HTMLImageElement>) => {
            func1Call();
        };

        const func2 = (e: React.SyntheticEvent<HTMLImageElement>, arg: number) => {
            if (e) e.stopPropagation(); // Prevents calling the onLoad function defined in the element
            func2Call(arg);
        };

        const func3 = (e: React.SyntheticEvent<HTMLImageElement>) => {
            func3Call();
        };

        const fnBundle = Utils.composeEventHandlers(func1, func2, func3);
        fnBundle(event, 12);

        expect(func1Call).toBeCalledTimes(1);

        expect(func2Call).toBeCalledTimes(1);
        expect(func2Call).toBeCalledWith(12);

        expect(func3Call).toBeCalledTimes(0);

        let isPropagationStopped = jest.fn(() => false);
        Object.defineProperty(event, 'isPropagationStopped', {
            writable: true,
            value: isPropagationStopped,
        });
        fnBundle(event);
        expect(isPropagationStopped).toBeCalledTimes(3);
        expect(func3Call).toBeCalledTimes(1);

        isPropagationStopped = jest.fn(() => true);
        Object.defineProperty(event, 'isPropagationStopped', {
            writable: false,
            value: isPropagationStopped,
        });
        fnBundle(event);
        expect(isPropagationStopped).toBeCalledTimes(1);
        expect(func3Call).toBeCalledTimes(1);

        fnBundle(null);
        expect(func3Call).toBeCalledTimes(2);
    });

    test('test mergeObjects function', () => {
        expect(Utils.mergeObjects({ key11: 5 })).toEqual({ key11: 5 });
        expect(Utils.mergeObjects({ key11: 5 }, { key21: 'value21' })).toEqual({
            key11: 5,
            key21: 'value21',
        });
        expect(Utils.mergeObjects({ key11: 5 }, { el: 'a' }, { el: 'b' })).toEqual({
            key11: 5,
            el: 'b',
        });
        expect(Utils.mergeObjects({ key11: 5 }, { el: 'a' }, { el: { key22: 'b' } })).toEqual({
            key11: 5,
            el: { key22: 'b' },
        });

        try {
            Utils.mergeObjects({ key11: 5 }, [21]);
        } catch (err) {
            expect(err).toEqual('One of the elements is an array: 21');
        }
    });

    test('test insertIntoObject function', () => {
        expect(Utils.insertIntoObject({ srcField: 5 }, {})).toEqual({ srcField: 5 });
        expect(Utils.insertIntoObject({ srcField: 5 }, { someField: 'smth' })).toEqual({
            srcField: 5,
            someField: 'smth',
        });
        expect(Utils.insertIntoObject({ srcField: 5 }, { someField: 'smth' }, 'newPath')).toEqual({
            srcField: 5,
            newPath: { someField: 'smth' },
        });
        expect(Utils.insertIntoObject({ srcField: 5 }, { someField: 'smth' }, 'key1.key2')).toEqual(
            { srcField: 5, key1: { key2: { someField: 'smth' } } }
        );
        expect(
            Utils.insertIntoObject(
                { srcField: 5, override: { srcField2: 10 } },
                { someField: 'smth' },
                'override'
            )
        ).toEqual({ srcField: 5, override: { srcField2: 10, someField: 'smth' } });
        expect(
            Utils.insertIntoObject(
                { srcField: 5, override: { srcField2: 10 } },
                { srcField2: 'smth' },
                'override'
            )
        ).toEqual({ srcField: 5, override: { srcField2: 10 } });
        expect(
            Utils.insertIntoObject(
                { srcField: 5, override: { srcField2: 10 } },
                { srcField2: 'smth' },
                'override',
                true
            )
        ).toEqual({ srcField: 5, override: { srcField2: 'smth' } });
    });

    test('test mergeStyles function', () => {
        expect(Utils.mergeStyles({ defCls: 'clsName' })).toEqual({
            classNames: { defCls: 'clsName' },
            styles: {},
            mergedResult: { defClsStyle: { className: 'clsName', style: undefined } },
        });

        expect(
            Utils.mergeStyles(
                { defCls1: 'clsName1', defCls2: 'clsName2' },
                { defCls1: 'overridenClsName' }
            )
        ).toEqual({
            classNames: { defCls1: 'overridenClsName', defCls2: 'clsName2' },
            styles: {},
            mergedResult: {
                defCls1Style: { className: 'overridenClsName', style: undefined },
                defCls2Style: { className: 'clsName2', style: undefined },
            },
        });

        expect(
            Utils.mergeStyles(
                { defCls1: 'clsName1', defCls2: 'clsName2' },
                { defCls1: 'overridenClsName' },
                { defCls2: { color: 'red' } }
            )
        ).toEqual({
            classNames: { defCls1: 'overridenClsName', defCls2: 'clsName2' },
            styles: { defCls2: { color: 'red' } },
            mergedResult: {
                defCls1Style: { className: 'overridenClsName', style: undefined },
                defCls2Style: { className: 'clsName2', style: { color: 'red' } },
            },
        });
    });
});
