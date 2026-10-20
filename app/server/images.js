// Builds and caches the images that environments and add-on services use.
// Every image is built locally from a folder in the repository, tagged with a
// hash of its inputs, and labelled with the project label. After a build,
// "check" runs in the new image; an image that fails it is removed, so a
// broken image is never reused.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { PROJECT_LABEL, PROJECT_VALUE, RECIPE_LABEL } from './config.js';

export function imageRecipes(versions) {
  const img = versions.images;
  const tools = versions.tools;
  const providers = versions.terraform_providers;
  const actions = versions.actions;
  const pip = versions.pip;
  return {
    base: {
      dir: 'environments/base',
      title: 'base Linux environment',
      upstream: [`ubuntu:${img.ubuntu}`],
      args: { UBUNTU_IMAGE: `ubuntu:${img.ubuntu}` },
      check: 'curl --version && python3 -c "import yaml" && git --version && jq --version && man -w ls && sudo --version && id user',
    },
    systemd: {
      dir: 'environments/systemd',
      title: 'systemd environment',
      parent: 'base',
      check: 'test -x /sbin/init && systemctl --version && systemctl is-enabled lab-init.service && command -v cron',
    },
    docker: {
      dir: 'environments/docker',
      title: 'Docker environment',
      parent: 'base',
      args: {
        DOCKER_CE_VERSION: tools.docker_ce,
        CONTAINERD_VERSION: tools.containerd,
        COMPOSE_VERSION: tools.compose_plugin,
        BUILDX_VERSION: tools.buildx_plugin,
      },
      check: 'dockerd --version && containerd --version && docker compose version && docker buildx version && id -nG user | grep -qw docker',
    },
    kubernetes: {
      dir: 'environments/kubernetes',
      title: 'Kubernetes tools',
      parent: 'base',
      args: { KUBECTL_VERSION: tools.kubectl, HELM_VERSION: tools.helm },
      check: 'kubectl version --client && helm version',
    },
    k3s: {
      dir: 'environments/k3s',
      title: 'Kubernetes cluster node',
      parent: 'base',
      upstream: [`rancher/k3s:${img.k3s}`],
      args: { K3S_IMAGE: `rancher/k3s:${img.k3s}`, ARGOCD_VERSION: tools.argocd, REDIS_IMAGE: `redis:${img.redis}` },
      check: 'k3s --version && grep -q "argocd:" /opt/devops-labs/argocd/install.yaml && test -f /etc/rancher/k3s/registries.yaml',
    },
    terraform: {
      dir: 'environments/terraform',
      title: 'Terraform environment',
      parent: 'base',
      args: {
        TERRAFORM_VERSION: tools.terraform,
        TF_AWS_VERSION: providers['hashicorp/aws'],
        TF_LOCAL_VERSION: providers['hashicorp/local'],
        TF_RANDOM_VERSION: providers['hashicorp/random'],
        TF_NULL_VERSION: providers['hashicorp/null'],
      },
      check: `terraform version && for p in aws local random null; do ls -d /usr/share/terraform/providers/registry.terraform.io/hashicorp/$p/*/linux_*; done`,
    },
    sim: { dir: 'addons/sim', title: 'simulated services', parent: 'base', check: 'dnsmasq --version && openssl version' },
    gitea: {
      dir: 'addons/gitea',
      title: 'Gitea',
      upstream: [`gitea/gitea:${img.gitea}`],
      args: {
        GITEA_IMAGE: `gitea/gitea:${img.gitea}`,
        CHECKOUT_VERSION: actions['actions/checkout'],
        UPLOAD_ARTIFACT_VERSION: actions['actions/upload-artifact'],
        DOWNLOAD_ARTIFACT_VERSION: actions['actions/download-artifact'],
      },
      check: 'gitea --version && for a in checkout upload-artifact download-artifact; do git -C /opt/devops-labs/actions/$a log --oneline -1; done',
    },
    runner: {
      dir: 'addons/runner',
      title: 'Gitea Actions runner',
      parent: 'docker',
      upstream: [`gitea/act_runner:${img.act_runner}`],
      args: {
        ACT_RUNNER_IMAGE: `gitea/act_runner:${img.act_runner}`,
        NODE_VERSION: img.node.split('-')[0],
        TRIVY_VERSION: tools.trivy,
        GITLEAKS_VERSION: tools.gitleaks,
        BANDIT_VERSION: pip.bandit,
        PIP_WHEELS: [
          ...['pytest', 'flask', 'pyyaml', 'prometheus-client', 'django'].map((name) => `${name}==${pip[name]}`),
          `django==${versions.lab_fixed.django_vulnerable}`,
        ].join(' '),
      },
      check: 'act_runner --version && node --version && trivy --version && gitleaks version && bandit --version && ls /opt/wheels | grep -qi flask',
    },
    registry: {
      dir: 'addons/registry',
      title: 'container registry',
      upstream: [`registry:${img.registry}`],
      args: { REGISTRY_IMAGE: `registry:${img.registry}` },
      check: 'registry --version && test -f /etc/distribution/mirror.yml',
    },
    moto: {
      dir: 'addons/moto',
      title: 'Moto server',
      upstream: [`motoserver/moto:${img.moto}`],
      args: { MOTO_IMAGE: `motoserver/moto:${img.moto}` },
      check: 'python3 -c "import moto.server"',
    },
    prometheus: {
      dir: 'addons/prometheus',
      title: 'Prometheus',
      upstream: [`prom/prometheus:${img.prometheus}`],
      args: { PROMETHEUS_IMAGE: `prom/prometheus:${img.prometheus}` },
      check: 'prometheus --version && promtool check config /etc/prometheus/prometheus.yml',
    },
    grafana: {
      dir: 'addons/grafana',
      title: 'Grafana',
      upstream: [`grafana/grafana:${img.grafana}`],
      args: { GRAFANA_IMAGE: `grafana/grafana:${img.grafana}` },
      check: 'grafana --version && test -f /etc/grafana/provisioning/datasources/prometheus.yml',
    },
  };
}

function hashDir(hash, dir, prefix = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) hashDir(hash, full, rel);
    else if (entry.isFile()) {
      hash.update(rel);
      hash.update(fs.readFileSync(full));
    }
  }
}

// Output of a download that failed because the internet connection dropped
// or is too slow to work with (apt, curl, wget, git, Docker and Node.js).
const NETWORK_FAILURE =
  /Temporary failure resolving|Could not resolve|bad address|no such host|Name or service not known|Network is unreachable|Connection timed out|Connection reset|connection reset by peer|Connection refused|i\/o timeout|TLS handshake timeout|unexpected EOF|context deadline exceeded|dial tcp|Failed to connect|Unable to connect|Could not connect|curl: \((5|6|7|28|35|52|56)\)|EAI_AGAIN|ENOTFOUND|ECONNRESET|ETIMEDOUT|ENETUNREACH/i;

export function isNetworkFailure(text) {
  return NETWORK_FAILURE.test(text);
}

const OFFLINE_ADVICE = 'the internet connection seems to be down or too slow. Nothing was left half-built. Check your connection, then click Try Again.';

export class ImageBuilder {
  // noCache: build every image from scratch once (fresh upstream images, no
  // build cache), even when it already exists. Used by the image test.
  constructor({ engine, root, versions, log = () => {}, noCache = false }) {
    this.engine = engine;
    this.root = root;
    this.recipes = imageRecipes(versions);
    this.log = log;
    this.noCache = noCache;
    this.fresh = new Set();
    this.tags = new Map();
    this.pending = new Map();
    this.arch = null;
  }

  async getArch() {
    if (!this.arch) this.arch = (await this.engine.info()).arch;
    return this.arch;
  }

  tagFor(name) {
    if (this.tags.has(name)) return this.tags.get(name);
    const recipe = this.recipes[name];
    if (!recipe) throw new Error(`Unknown image recipe ${name}`);
    const hash = crypto.createHash('sha256');
    hash.update(name);
    hash.update(JSON.stringify(Object.entries(recipe.args || {}).sort()));
    if (recipe.parent) hash.update(this.tagFor(recipe.parent));
    hashDir(hash, path.join(this.root, recipe.dir));
    const tag = `devops-labs/${name}:${hash.digest('hex').slice(0, 12)}`;
    this.tags.set(name, tag);
    return tag;
  }

  // Names of recipes needed for an image, parents first.
  chain(name) {
    const recipe = this.recipes[name];
    return recipe.parent ? [...this.chain(recipe.parent), name] : [name];
  }

  async isReady(name) {
    for (const step of this.chain(name)) {
      if (!(await this.engine.imageExists(this.tagFor(step)))) return false;
    }
    return true;
  }

  // Makes sure the image exists, building it (and its parents) if needed.
  async ensure(name, onProgress = () => {}) {
    for (const step of this.chain(name)) {
      await this.ensureOne(step, onProgress);
    }
    return this.tagFor(name);
  }

  async ensureOne(name, onProgress) {
    const tag = this.tagFor(name);
    if (this.pending.has(name)) {
      // Another launch is already building it; follow along.
      onProgress(`Waiting for the ${this.recipes[name].title} image to finish building`);
      return this.pending.get(name);
    }
    if ((!this.noCache || this.fresh.has(name)) && (await this.engine.imageExists(tag))) return tag;
    const job = this.build(name, tag, onProgress).finally(() => this.pending.delete(name));
    this.pending.set(name, job);
    return job;
  }

  async build(name, tag, onProgress) {
    const recipe = this.recipes[name];
    const arch = await this.getArch();
    onProgress(`Preparing environment, first time only: building the ${recipe.title} image`);
    // Upstream images downloaded only to build from are removed again,
    // whether the build works or not, so the only images left behind are
    // labelled ones owned by the project.
    const pulledByUs = [];
    try {
      for (const ref of recipe.upstream || []) {
        const present = await this.engine.imageExists(ref);
        if (!present || this.noCache) {
          onProgress(`Downloading ${ref}`);
          if (!present) pulledByUs.push(ref);
          await this.engine.pullImage(ref, () => {}).catch((err) => {
            if (isNetworkFailure(err.message)) throw new Error(`Could not download ${ref} for the ${recipe.title}: ${OFFLINE_ADVICE} (${err.message})`.slice(0, 600));
            throw new Error(`Downloading ${ref} for the ${recipe.title} failed: ${err.message}`.slice(0, 600));
          });
        }
      }
      await this.buildFromRecipe(name, recipe, tag, arch, onProgress);
    } finally {
      for (const ref of pulledByUs) await this.engine.removeImage(ref).catch(() => {});
    }
    onProgress(`Checking the ${recipe.title} image`);
    const check = await this.engine.runImage(tag, recipe.check);
    if (check.exitCode !== 0) {
      await this.engine.removeImage(tag, { force: true }).catch(() => {});
      const why = check.output.split('\n').map((l) => l.trim()).filter(Boolean).slice(-4).join(' | ');
      throw new Error(`The ${recipe.title} image is broken: its tool check failed${why ? `: ${why}` : ''}`.slice(0, 600));
    }
    this.fresh.add(name);
    await this.pruneOld(name, tag);
    onProgress(`Built the ${recipe.title} image`);
    return tag;
  }

  async buildFromRecipe(name, recipe, tag, arch, onProgress) {
    const buildargs = { ...(recipe.args || {}), TARGETARCH: arch };
    if (recipe.parent) buildargs.PARENT_IMAGE = this.tagFor(recipe.parent);
    const recent = [];
    await this.engine
      .buildImage({
        contextDir: path.join(this.root, recipe.dir),
        tag,
        buildargs,
        labels: { [RECIPE_LABEL]: name },
        noCache: this.noCache,
        onProgress: (line) => {
          if (/^Step \d+\/\d+/.test(line)) onProgress(`${recipe.title}: ${line.replace(/^Step (\d+\/\d+) :/, 'step $1:').slice(0, 160)}`);
          recent.push(line);
          if (recent.length > 12) recent.shift();
          this.log(`[build ${name}] ${line}`);
        },
      })
      .catch((err) => {
        // The engine reports the whole failing command; the last output lines say why.
        const output = recent.filter((l) => !/^Step \d+\/\d+/.test(l) && !/^ ---> /.test(l));
        const offline = [...new Set(output.filter(isNetworkFailure).map((l) => l.trim()))];
        if (offline.length || isNetworkFailure(err.message)) {
          const why = (offline.length ? offline.slice(-2) : [err.message]).join(' | ');
          throw new Error(`The ${recipe.title} image could not be built: ${OFFLINE_ADVICE} (${why})`.slice(0, 600));
        }
        const why = output.slice(-4).join(' | ');
        throw new Error(`Building the ${recipe.title} image failed${why ? `: ${why}` : ''}`.slice(0, 600));
      });
  }

  // Removes older builds of the same recipe.
  async pruneOld(name, keepTag) {
    const images = await this.engine.listImages({ [PROJECT_LABEL]: PROJECT_VALUE, [RECIPE_LABEL]: name });
    for (const image of images) {
      const tags = image.RepoTags || [];
      if (tags.includes(keepTag)) continue;
      await this.engine.removeImage(image.Id).catch(() => {});
    }
  }

  // Removes images built for other versions of the recipes, for example the
  // ones an older release of DevOps Labs left behind. Children go first, as
  // an image with dependent images cannot be removed.
  async pruneStale() {
    const names = Object.keys(this.recipes).sort((a, b) => this.chain(b).length - this.chain(a).length);
    for (const name of names) await this.pruneOld(name, this.tagFor(name));
  }

  async status() {
    const result = {};
    for (const name of Object.keys(this.recipes)) {
      result[name] = await this.engine.imageExists(this.tagFor(name));
    }
    return result;
  }
}
