import * as React from 'react';
interface SettingsProps {
    schema: any;
    options: any;
    onChange: (any: any) => void;
}
export default class Settings extends React.Component<SettingsProps> {
    render(): JSX.Element;
}
export {};
