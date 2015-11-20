import * as _ from 'derivable';
declare module ddom {
    type BehaviourAssigner = (node: HTMLElement) => _.Reactor<any> | void;
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
        function BindValue(atom: _.Atom<any>): BehaviourAssigner;
        function Value(): [_.Derivable<string>, BehaviourAssigner];
        function BindFocus(atom: _.Atom<any>): BehaviourAssigner;
        function Focus(): [_.Derivable<boolean>, BehaviourAssigner];
        function BindHover(atom: _.Atom<any>): BehaviourAssigner;
        function Hover(): [_.Derivable<boolean>, BehaviourAssigner];
    }
}
export = ddom;
