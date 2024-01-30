import * as React from 'react';
import './Argument.css';
interface ArgumentProps {
    arg: any;
    expanded: boolean;
    onTypeLink: (any: any) => void;
}
export default class Argument extends React.Component<ArgumentProps> {
    render(): JSX.Element;
}
export {};
