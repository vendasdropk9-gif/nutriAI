import { pathToFileURL } from 'url';
export async function resolve(specifier, context, nextResolve) {
  if (specifier.match(/\.(css|jpg|jpeg|png|svg|wav|mp3|gif)$/i)) {
    return {
      format: 'module',
      shortCircuit: true,
      url: pathToFileURL('./mock.css').href,
    };
  }
  return nextResolve(specifier, context);
}
export async function load(url, context, nextLoad) {
  if (url.endsWith('mock.css')) {
    return {
      format: 'module',
      shortCircuit: true,
      source: 'export default "mocked";',
    };
  }
  return nextLoad(url, context);
}
