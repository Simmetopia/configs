import * as React from 'react';
import './Description.css';
interface DescriptionProps {
    text?: string;
    className: string;
}
export default class Description extends React.Component<DescriptionProps> {
    render(): JSX.Element;
}
export {};
