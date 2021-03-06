import {ensure, resolve} from './ensure'
import {Component} from 'preact'

export type QueueCall = (c: Component, el: HTMLElement) => void
export type CleanupCall = () => void

const mountQueue = new WeakMap<any, Array<QueueCall>>()
const unmountQueue = new WeakMap<Component, Array<CleanupCall>>()

export const runMountQueue = (comp: Component, el: HTMLElement) => {
    const q = resolve(mountQueue, comp, 'constructor')
    if (q) {
        q.forEach(func => func(comp, el))
    }
}

export const runUnmountQueue = (c: Component) => {
    unmountQueue.has(c) &&
    unmountQueue.get(c).forEach(func => func())
}

export const addToMountQueue = (proto: any, call: QueueCall) => {
    ensure(mountQueue, proto.constructor, [call])
}

export const addToCleanupQueue = (comp: Component, call: CleanupCall) =>
    ensure(mountQueue, comp, [call])

