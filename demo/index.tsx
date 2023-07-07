import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter, NavLink, Route, Switch, Redirect } from 'react-router-dom';

import { Paper, CircularProgress, LinearProgress } from '@material-ui/core';

import './index.scss';

// which language will be used (TypeScript or JavaScript)
const typescript = false;

const folder = typescript ? 'ts' : 'js';

const Minimal = lazy(() => import(`./Minimal`));
const Basic = lazy(() => import(`./Basic/${folder}`));
const OverriddenUI = lazy(() => import(`./OverriddenUI/${folder}`));
const CustomUI = lazy(() => import(`./CustomUI/${folder}`));
const Previews = lazy(() => import(`./Previews/${folder}`));
const Scrolling = lazy(() => import(`./Scrolling/${folder}`));
const FileValidation = lazy(() => import(`./FileValidation/${folder}`));
const ExposedFunctions = lazy(() => import(`./ExposedFunctions/${folder}`));
const AdvancedUploading = lazy(() => import(`./AdvancedUploading/${folder}`));
const Avatar = lazy(() => import(`./Avatar/${folder}`));

const modules = [
    {
        name: 'Minimal',
        src: <Minimal />,
        url: 'minimal',
    },
    {
        name: 'Basic',
        src: <Basic />,
        url: 'basic',
    },
    {
        name: 'Overridden UI',
        src: <OverriddenUI />,
        url: 'overridden-ui',
    },
    {
        name: 'Custom UI',
        src: <CustomUI />,
        url: 'custom-ui',
    },
    {
        name: 'Previews',
        src: <Previews />,
        url: 'previews',
    },
    {
        name: 'Scrolling',
        src: <Scrolling />,
        url: 'scrolling',
    },
    {
        name: 'File Validation',
        src: <FileValidation />,
        url: 'file-validation',
    },
    {
        name: 'Using Exposed Functions',
        src: <ExposedFunctions />,
        url: 'exposed-functions',
    },
    {
        name: 'Advanced Uploading',
        src: <AdvancedUploading />,
        url: 'advanced-uploading',
    },
    {
        name: 'Avatar',
        src: <Avatar />,
        url: 'avatar',
    },
];

const generateLinks = () =>
    modules.map((module, i) => (
        <div key={`link-${i}`}>
            <NavLink activeClassName="active" to={`/${module.url}`}>
                {module.name}
            </NavLink>
        </div>
    ));

const generateRoutes = () =>
    modules.map((module, i) => (
        <Route key={`route-${i}`} path={`/${module.url}`}>
            {module.src}
        </Route>
    ));

const fallbackRenderer = () => (
    <>
        <LinearProgress className="progressBar" />
        <div className="loading">
            Loading...
            <CircularProgress />
        </div>
    </>
);

function App() {
    return (
        <div className="app">
            <BrowserRouter>
                <nav>{generateLinks()}</nav>
                <Paper className="paper">
                    <Suspense fallback={fallbackRenderer()}>
                        <Switch>
                            <Route path="/" exact>
                                <Redirect to={'/minimal'} />
                            </Route>
                            {generateRoutes()}
                        </Switch>
                    </Suspense>
                </Paper>
            </BrowserRouter>
        </div>
    );
}

ReactDOM.render(<App />, document.getElementById('root'));
