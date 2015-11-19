import * as _ from 'derivable';
export declare function lifecycle(child: HTMLElement, reactor: _.Reactor<any>): any;
export declare function lifecycle(child: HTMLElement, onMount: () => void, onUnmount: () => void): any;
export declare const renderable: any;
export declare function dom(tagName: string, props: any, ...children: any[]): HTMLElement;
export declare function root(parent: HTMLElement, child: Node): void;
export declare const React: {
    createElement: (tagName: string, props: any, ...children: any[]) => HTMLElement;
};
