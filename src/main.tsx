import React from 'react';
import {createRoot} from 'react-dom/client';
import Entry from './entry';
import './style.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><Entry/></React.StrictMode>);
