import React from 'react';
import {createRoot} from 'react-dom/client';
import App from '../src/components/App';
import '../src/app/globals.css';
import '../src/app/redesign.css';
createRoot(document.getElementById('root')!).render(<App/>);
