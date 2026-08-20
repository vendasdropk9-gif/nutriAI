const express = require('express');
const { JSDOM } = require("jsdom");
const path = require('path');

const app = express();
app.use(express.static(path.join(__dirname, 'dist')));

const server = app.listen(3001, () => {
  const url = "http://localhost:3001/";
  JSDOM.fromURL(url, {
    runScripts: "dangerously",
    resources: "usable",
    pretendToBeVisual: true
  }).then(dom => {
    dom.window.console.error = (msg, ...args) => console.error("BROWSER ERROR:", msg, ...args);
    dom.window.console.log = (msg, ...args) => console.log("BROWSER LOG:", msg, ...args);
    
    dom.window.addEventListener("error", (event) => {
      console.error("BROWSER UNCAUGHT ERROR:", event.error || event.message);
    });
    
    dom.window.addEventListener("unhandledrejection", (event) => {
      console.error("BROWSER UNHANDLED REJECTION:", event.reason);
    });
    
    setTimeout(() => {
      console.log("Root content:", dom.window.document.getElementById("root").innerHTML.substring(0, 100));
      server.close();
      process.exit(0);
    }, 2000);
  });
});
