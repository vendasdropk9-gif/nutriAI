const { JSDOM } = require("jsdom");
const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.join(__dirname, "dist", "index.html"), "utf8");

const dom = new JSDOM(html, {
  url: "http://localhost/",
  runScripts: "dangerously",
  resources: "usable",
  console: true
});

dom.window.console.error = (msg, ...args) => console.error("BROWSER ERROR:", msg, ...args);
dom.window.console.log = (msg, ...args) => console.log("BROWSER LOG:", msg, ...args);
dom.window.console.warn = (msg, ...args) => console.warn("BROWSER WARN:", msg, ...args);

dom.window.addEventListener("error", (event) => {
  console.error("BROWSER UNCAUGHT ERROR:", event.error || event.message);
});

dom.window.addEventListener("unhandledrejection", (event) => {
  console.error("BROWSER UNHANDLED REJECTION:", event.reason);
});

setTimeout(() => {
  console.log("Root content:", dom.window.document.getElementById("root").innerHTML.substring(0, 100));
  process.exit(0);
}, 2000);
