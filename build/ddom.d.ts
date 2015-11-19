import * as _ from 'derivable';
declare module ddom {
    type BehaviourAssigner = (node: HTMLElement) => _.Reactor<any>;
    function lifecycle(child: HTMLElement, reactor: _.Reactor<any>): any;
    function lifecycle(child: HTMLElement, onMount: () => void, onUnmount: () => void): any;
    const renderable: any;
    function dom(tagName: string, props: any, ...children: any[]): HTMLElement;
    function root(parent: HTMLElement, child: Node): void;
    const React: {
        createElement: (tagName: string, props: any, ...children: any[]) => HTMLElement;
    };
    module behaviour {
        function ShowWhen(when: _.Derivable<any>): BehaviourAssigner;
        function HideWhen(when: _.Derivable<any>): BehaviourAssigner;
    }
}
export = ddom;
