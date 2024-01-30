import * as React from 'react';
import './RootSelector.css';
interface RootSelectorProps {
    rootType?: string;
    schema: any;
    onChange: any;
}
export default class RootSelector extends React.Component<RootSelectorProps> {
    render(): JSX.Element;
}
export {};
