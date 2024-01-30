import * as React from 'react';
import './TypeInfoPopover.css';
interface ScalarDetailsProps {
    type: any;
    onChange: any;
}
interface ScalarDetailsState {
    localType: any;
}
export default class ScalarDetails extends React.Component<ScalarDetailsProps, ScalarDetailsState> {
    constructor(props: any);
    close(): void;
    render(): JSX.Element;
}
export {};
