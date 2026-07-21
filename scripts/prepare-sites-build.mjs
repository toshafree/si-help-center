import { copyFile, cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const distDir = path.resolve('dist');
const clientDir = path.join(distDir, 'client');
const serverDir = path.join(distDir, 'server');
const distOpenAiDir = path.join(distDir, '.openai');

const workerSource = `const SECURITY_HEADERS = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin"
};

function withHeaders(response) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

async function fetchAsset(request, env, pathname) {
  const url = new URL(request.url);
  url.pathname = pathname;
  return env.ASSETS.fetch(new Request(url, request));
}

export default {
  async fetch(request, env) {
    if (!env.ASSETS) {
      return new Response("Static assets binding is not configured.", { status: 500 });
    }

    const direct = await env.ASSETS.fetch(request);
    if (direct.status !== 404) return withHeaders(direct);

    const url = new URL(request.url);
    const hasExtension = /\\.[^/]+$/.test(url.pathname);
    const indexPath = url.pathname.endsWith("/")
      ? url.pathname + "index.html"
      : hasExtension
        ? url.pathname
        : url.pathname + "/index.html";

    if (indexPath !== url.pathname) {
      const indexResponse = await fetchAsset(request, env, indexPath);
      if (indexResponse.status !== 404) return withHeaders(indexResponse);
    }

    const notFound = await fetchAsset(request, env, "/404.html");
    return withHeaders(new Response(notFound.body, {
      status: 404,
      statusText: "Not Found",
      headers: notFound.headers
    }));
  }
};
`;

await mkdir(serverDir, { recursive: true });
await rm(clientDir, { force: true, recursive: true });
await mkdir(clientDir, { recursive: true });
await mkdir(distOpenAiDir, { recursive: true });

for (const entry of await readdir(distDir, { withFileTypes: true })) {
  if (['client', 'server', '.openai'].includes(entry.name)) continue;
  await cp(path.join(distDir, entry.name), path.join(clientDir, entry.name), {
    recursive: true,
  });
}

await writeFile(path.join(serverDir, 'index.js'), workerSource);
await copyFile(path.resolve('.openai/hosting.json'), path.join(distOpenAiDir, 'hosting.json'));

console.log('Prepared Sites build at dist/server/index.js with static assets in dist/client');
