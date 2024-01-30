import * as React from 'react';
import './TypeLink.css';
interface TypeLinkProps {
    type: {
        name: string;
    };
    onClick: (any: any) => void;
    filter?: string;
}
export default class TypeLink extends React.Component<TypeLinkProps> {
    render(): JSX.Element;
}
export {};
