import React from 'react';
import {createRoot} from 'react-dom/client';
import App from '../src/components/App';
import '../src/app/globals.css';
createRoot(document.getElementById('root')!).render(<App/>);
