// Runtime definitions of environments and add-on services: which containers
// a lab session needs and how to tell when they are ready.
import { shellQuote, waitFor } from './util.js';

export const LAB_USER = 'user';
export const SUDO_PASSWORD = 'user@123!';

export const CREDENTIALS = {
  gitea: { user: 'student', password: 'student@123!' },
  grafana: { user: 'admin', password: 'grafana@123!' },
  argocd: { user: 'admin', password: 'argocd@123!' },
  registry: { user: 'ci', password: 'registry@123!' },
};

// Environment definitions. "services" are started automatically with every
// lab of the environment.
export const ENVIRONMENTS = {
  base: { recipe: 'base', services: [] },
  systemd: { recipe: 'systemd', systemd: true, privileged: true, services: [] },
  docker: { recipe: 'docker', privileged: true, dockerVolume: true, services: ['mirror-docker'] },
  kubernetes: { recipe: 'kubernetes', services: ['mirror-docker', 'mirror-quay', 'k3s'] },
  terraform: { recipe: 'terraform', services: [] },
};

// Add-ons a lab can ask for, mapped to the services they start.
export const ADDONS = {
  gitea: ['gitea', 'runner'],
  registry: ['registry'],
  moto: ['moto'],
  prometheus: ['prometheus'],
  grafana: ['prometheus', 'grafana'],
  argocd: ['argocd'],
};

export const CACHE_VOLUMES = {
  'mirror-docker': 'devops-labs-cache-docker-hub',
  'mirror-quay': 'devops-labs-cache-quay',
};

function mirrorService(name, remote) {
  return {
    name,
    recipe: 'registry',
    alias: name,
    order: 0,
    spec: () => ({
      Env: [`REGISTRY_PROXY_REMOTEURL=${remote}`, 'REGISTRY_HTTP_ADDR=0.0.0.0:5000', 'OTEL_TRACES_EXPORTER=none'],
      Cmd: ['/etc/distribution/mirror.yml'],
      HostConfig: { Mounts: [{ Type: 'volume', Source: CACHE_VOLUMES[name], Target: '/var/lib/registry' }] },
    }),
    persistentVolume: CACHE_VOLUMES[name],
    ready: (s) => s.labTcp(name, 5000),
  };
}

export function serviceDefinitions(config) {
  const ports = config.hostPorts;
  return {
    'mirror-docker': mirrorService('mirror-docker', 'https://registry-1.docker.io'),
    'mirror-quay': mirrorService('mirror-quay', 'https://quay.io'),
    k3s: {
      name: 'k3s',
      recipe: 'k3s',
      alias: 'k3s',
      order: 1,
      spec: (s) => ({
        Cmd: ['server', '--tls-san', 'k3s', '--node-name', 'k3s', '--write-kubeconfig-mode', '644'],
        HostConfig: {
          Privileged: true,
          Tmpfs: { '/run': '', '/var/run': '' },
          Mounts: [{ Type: 'volume', Source: s.volumeName('k3s'), Target: '/var/lib/rancher/k3s' }],
          PortBindings: s.addons.includes('argocd') ? { '30804/tcp': [{ HostIp: '127.0.0.1', HostPort: String(ports.argocd) }] } : {},
        },
        ExposedPorts: s.addons.includes('argocd') ? { '30804/tcp': {} } : {},
      }),
      volumes: ['k3s'],
      ready: async (s) => {
        s.progress('Starting the Kubernetes cluster');
        await waitFor(async () => (await s.execIn('k3s', ['kubectl', 'get', '--raw', '/readyz'])).exitCode === 0, {
          timeoutMs: 240000,
          intervalMs: 2000,
          description: 'the Kubernetes API server',
          signal: s.signal,
        });
        s.progress('Waiting for the cluster add-ons (DNS, ingress, storage, metrics)');
        await waitFor(
          async () => {
            const r = await s.execIn('k3s', ['sh', '-c', K3S_SYSTEM_READY]);
            return r.exitCode === 0;
          },
          { timeoutMs: 420000, intervalMs: 3000, description: 'the cluster add-ons', signal: s.signal },
        );
        const kubeconfig = await s.execIn('k3s', ['cat', '/etc/rancher/k3s/k3s.yaml']);
        const content = kubeconfig.stdout.replace(/https:\/\/127\.0\.0\.1:6443/g, 'https://k3s:6443');
        await s.putLabFile('/home/user/.kube', 'config', content, { uid: 1000, gid: 1000, mode: 0o600 });
        await s.putLabFile('/root/.kube', 'config', content, { mode: 0o600 });
      },
    },
    gitea: {
      name: 'gitea',
      recipe: 'gitea',
      alias: 'gitea',
      order: 1,
      forward: { port: ports.gitea, target: 'gitea:3000' },
      ui: { label: 'Open Gitea', port: ports.gitea, path: '/' },
      spec: () => ({
        Env: [
          `GITEA__server__ROOT_URL=http://localhost:${ports.gitea}/`,
          `GITEA__server__DOMAIN=localhost`,
          `GITEA__server__SSH_DOMAIN=localhost`,
        ],
        HostConfig: { PortBindings: { '3000/tcp': [{ HostIp: '127.0.0.1', HostPort: String(ports.gitea) }] } },
        ExposedPorts: { '3000/tcp': {} },
      }),
      ready: async (s) => {
        s.progress('Starting Gitea');
        await waitFor(async () => (await s.execIn('gitea', ['curl', '-sf', 'http://localhost:3000/api/healthz'])).exitCode === 0, {
          timeoutMs: 180000,
          intervalMs: 1500,
          description: 'Gitea',
          signal: s.signal,
        });
        s.progress('Creating the Gitea account and repositories');
        const init = await s.execIn('gitea', ['/usr/local/bin/devops-labs-gitea-init'], {
          env: [`GITEA_STUDENT_USER=${CREDENTIALS.gitea.user}`, `GITEA_STUDENT_PASSWORD=${CREDENTIALS.gitea.password}`],
          timeoutMs: 240000,
        });
        if (init.exitCode !== 0) throw new Error(`Gitea setup failed: ${(init.stderr || init.stdout).slice(-600)}`);
        const token = init.stdout.trim().split('\n').pop().trim();
        s.state.runnerToken = token;
      },
    },
    runner: {
      name: 'runner',
      recipe: 'runner',
      alias: 'runner',
      order: 2,
      after: 'gitea',
      forwards: [{ port: ports.gitea, target: 'gitea:3000' }],
      spec: (s) => ({
        Env: [
          'GITEA_INSTANCE_URL=http://gitea:3000',
          `GITEA_RUNNER_REGISTRATION_TOKEN=${s.state.runnerToken || ''}`,
          `GITEA_PUBLIC_URL=http://localhost:${ports.gitea}`,
        ],
        HostConfig: {
          Privileged: true,
          Init: true,
          Mounts: [{ Type: 'volume', Source: s.volumeName('runner-docker'), Target: '/var/lib/docker' }],
        },
      }),
      volumes: ['runner-docker'],
      ready: async (s) => {
        s.progress('Starting the Gitea Actions runner');
        await waitFor(async () => (await s.execIn('runner', ['test', '-f', '/run/devops-labs/runner-ready'])).exitCode === 0, {
          timeoutMs: 180000,
          intervalMs: 1500,
          description: 'the Gitea Actions runner',
          signal: s.signal,
        });
      },
    },
    registry: {
      name: 'registry',
      recipe: 'registry',
      alias: 'registry',
      order: 1,
      spec: () => ({ Cmd: ['/etc/distribution/registry.yml'], Env: ['OTEL_TRACES_EXPORTER=none'] }),
      ready: (s) => s.labTcp('registry', 5000),
    },
    moto: {
      name: 'moto',
      recipe: 'moto',
      alias: 'moto',
      order: 1,
      spec: () => ({}),
      ready: (s) => s.labTcp('moto', 5000),
    },
    prometheus: {
      name: 'prometheus',
      recipe: 'prometheus',
      alias: 'prometheus',
      order: 0,
      forward: { port: ports.prometheus, target: 'prometheus:9090' },
      ui: { label: 'Open Prometheus', port: ports.prometheus, path: '/' },
      spec: (s) => ({
        HostConfig: {
          PortBindings: { '9090/tcp': [{ HostIp: '127.0.0.1', HostPort: String(ports.prometheus) }] },
          Mounts: [{ Type: 'volume', Source: s.volumeName('prometheus-config'), Target: '/etc/prometheus' }],
        },
        ExposedPorts: { '9090/tcp': {} },
      }),
      volumes: ['prometheus-config'],
      labMounts: [{ volume: 'prometheus-config', target: '/etc/prometheus' }],
      ready: (s) => s.labTcp('prometheus', 9090),
    },
    grafana: {
      name: 'grafana',
      recipe: 'grafana',
      alias: 'grafana',
      order: 1,
      forward: { port: ports.grafana, target: 'grafana:3000' },
      ui: { label: 'Open Grafana', port: ports.grafana, path: '/' },
      spec: () => ({
        Env: [
          `GF_SECURITY_ADMIN_USER=${CREDENTIALS.grafana.user}`,
          `GF_SECURITY_ADMIN_PASSWORD=${CREDENTIALS.grafana.password}`,
          `GF_SERVER_ROOT_URL=http://localhost:${ports.grafana}/`,
        ],
        HostConfig: { PortBindings: { '3000/tcp': [{ HostIp: '127.0.0.1', HostPort: String(ports.grafana) }] } },
        ExposedPorts: { '3000/tcp': {} },
      }),
      ready: async (s) => {
        s.progress('Starting Grafana');
        await waitFor(async () => (await s.execLab(['curl', '-sf', 'http://grafana:3000/api/health'])).exitCode === 0, {
          timeoutMs: 180000,
          intervalMs: 1500,
          description: 'Grafana',
          signal: s.signal,
        });
      },
    },
    argocd: {
      name: 'argocd',
      inCluster: true,
      order: 3,
      forward: { port: ports.argocd, target: 'k3s:30804' },
      ui: { label: 'Open Argo CD', port: ports.argocd, path: '/' },
      ready: async (s) => {
        s.progress('Installing Argo CD into the cluster');
        const r = await s.execIn('k3s', ['sh', '/opt/devops-labs/argocd/install.sh'], { timeoutMs: 600000 });
        if (r.exitCode !== 0) throw new Error(`Argo CD install failed: ${(r.stderr || r.stdout).slice(-600)}`);
      },
    },
  };
}

// Succeeds when every system workload k3s ships is available.
const K3S_SYSTEM_READY = [
  'for d in coredns local-path-provisioner metrics-server traefik; do',
  '  kubectl -n kube-system get deploy "$d" -o jsonpath="{.status.availableReplicas}" 2>/dev/null | grep -q "^[1-9]" || exit 1;',
  'done;',
  'kubectl get --raw /apis/metrics.k8s.io/v1beta1/nodes >/dev/null 2>&1 || exit 1',
].join(' ');

// Services for a lab: environment services, add-on services and lab-defined
// simulated services, in start order.
export function servicesForLab(lab, config) {
  const defs = serviceDefinitions(config);
  const names = [...ENVIRONMENTS[lab.environment].services];
  for (const addon of lab.addons) for (const svc of ADDONS[addon]) if (!names.includes(svc)) names.push(svc);
  const list = names.map((n) => defs[n]);
  for (const svc of lab.services) {
    list.push({
      name: svc.name,
      recipe: svc.recipe || 'sim',
      alias: svc.name,
      order: 0,
      custom: svc,
      spec: () => ({
        Cmd: svc.command ? ['bash', '-c', svc.command] : undefined,
        Env: Object.entries(svc.env || {}).map(([k, v]) => `${k}=${v}`),
        HostConfig: { CapAdd: svc.capAdd || [] },
      }),
      ready: svc.readyPort ? (s) => s.labTcp(svc.name, svc.readyPort) : undefined,
    });
  }
  return list.sort((a, b) => a.order - b.order);
}

export function labTcpCommand(host, port) {
  return ['bash', '-c', `exec 3<>/dev/tcp/${host}/${port}`];
}

export function forwardsFile(forwards) {
  return forwards.map((f) => `${f.port} ${f.target}`).join('\n') + '\n';
}

export { shellQuote };
