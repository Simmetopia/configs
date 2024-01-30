import * as React from 'react';
import './TypeList.css';
interface TypeListProps {
    typeGraph: any;
    filter: string;
    onFocusType: (any: any) => void;
    onTypeLink: (any: any) => void;
}
export default class TypeList extends React.Component<TypeListProps> {
    render(): JSX.Element;
}
export {};
