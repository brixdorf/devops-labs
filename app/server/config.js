import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

function int(value, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const PROJECT_LABEL = 'org.devopslabs.project';
export const PROJECT_VALUE = 'devops-labs';
export const SESSION_LABEL = 'org.devopslabs.session';
export const ROLE_LABEL = 'org.devopslabs.role';
export const RECIPE_LABEL = 'org.devopslabs.recipe';
export const PERSIST_LABEL = 'org.devopslabs.persist';

export function loadConfig(env = process.env) {
  const root = env.DEVOPS_LABS_ROOT || path.resolve(here, '..', '..');
  const versionsFile = path.join(root, 'versions.json');
  return {
    versions: JSON.parse(fs.readFileSync(versionsFile, 'utf8')),
    root,
    labsDir: env.DEVOPS_LABS_LABS_DIR || path.join(root, 'labs'),
    environmentsDir: path.join(root, 'environments'),
    addonsDir: path.join(root, 'addons'),
    versionsFile,
    webDir: env.DEVOPS_LABS_WEB_DIR || path.resolve(here, '..', 'dist'),
    listenPort: int(env.DEVOPS_LABS_LISTEN_PORT, 8800),
    idleTimeoutMs: int(env.DEVOPS_LABS_IDLE_SECONDS, 0) * 1000 || int(env.DEVOPS_LABS_IDLE_MINUTES, 15) * 60 * 1000,
    hostPorts: {
      app: int(env.DEVOPS_LABS_PORT, 8800),
      gitea: int(env.DEVOPS_LABS_GITEA_PORT, 8801),
      grafana: int(env.DEVOPS_LABS_GRAFANA_PORT, 8802),
      prometheus: int(env.DEVOPS_LABS_PROMETHEUS_PORT, 8803),
      argocd: int(env.DEVOPS_LABS_ARGOCD_PORT, 8804),
    },
    selftestTokenFile: env.DEVOPS_LABS_SELFTEST_TOKEN_FILE || '/tmp/devops-labs-selftest.token',
  };
}

// Pinned lab images, exposed to lab text as {{IMAGE_NGINX}} and to lab
// scripts as $IMAGE_NGINX, so labs never hard-code a version.
const LAB_IMAGES = { nginx: 'nginx', httpd: 'httpd', postgres: 'postgres', python: 'python', busybox: 'busybox', alpine: 'alpine', redis: 'redis' };

export function labImageVars(versions) {
  const vars = {};
  for (const [key, repo] of Object.entries(LAB_IMAGES)) vars[`IMAGE_${key.toUpperCase()}`] = `${repo}:${versions.images[key]}`;
  return vars;
}
