import { renderToString } from 'react-dom/server';
import React from 'react';
import App from './src/App.tsx';

try {
  console.log("Loading App...");
  console.log(typeof App);
} catch(e) {
  console.error("Error:", e);
}
