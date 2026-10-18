// Builds and caches the images that environments and add-on services use.
// Every image is built locally from a folder in the repository, tagged with a
// hash of its inputs, and labelled with the project label.
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
    },
    systemd: { dir: 'environments/systemd', title: 'systemd environment', parent: 'base' },
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
    },
    kubernetes: {
      dir: 'environments/kubernetes',
      title: 'Kubernetes tools',
      parent: 'base',
      args: { KUBECTL_VERSION: tools.kubectl, HELM_VERSION: tools.helm },
    },
    k3s: {
      dir: 'environments/k3s',
      title: 'Kubernetes cluster node',
      parent: 'base',
      upstream: [`rancher/k3s:${img.k3s}`],
      args: { K3S_IMAGE: `rancher/k3s:${img.k3s}`, ARGOCD_VERSION: tools.argocd, REDIS_IMAGE: `redis:${img.redis}` },
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
    },
    sim: { dir: 'addons/sim', title: 'simulated services', parent: 'base' },
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
    },
    registry: {
      dir: 'addons/registry',
      title: 'container registry',
      upstream: [`registry:${img.registry}`],
      args: { REGISTRY_IMAGE: `registry:${img.registry}` },
    },
    moto: {
      dir: 'addons/moto',
      title: 'Moto server',
      upstream: [`motoserver/moto:${img.moto}`],
      args: { MOTO_IMAGE: `motoserver/moto:${img.moto}` },
    },
    prometheus: {
      dir: 'addons/prometheus',
      title: 'Prometheus',
      upstream: [`prom/prometheus:${img.prometheus}`],
      args: { PROMETHEUS_IMAGE: `prom/prometheus:${img.prometheus}` },
    },
    grafana: {
      dir: 'addons/grafana',
      title: 'Grafana',
      upstream: [`grafana/grafana:${img.grafana}`],
      args: { GRAFANA_IMAGE: `grafana/grafana:${img.grafana}` },
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

export class ImageBuilder {
  constructor({ engine, root, versions, log = () => {} }) {
    this.engine = engine;
    this.root = root;
    this.recipes = imageRecipes(versions);
    this.log = log;
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
    if (await this.engine.imageExists(tag)) return tag;
    const job = this.build(name, tag, onProgress).finally(() => this.pending.delete(name));
    this.pending.set(name, job);
    return job;
  }

  async build(name, tag, onProgress) {
    const recipe = this.recipes[name];
    const arch = await this.getArch();
    onProgress(`Preparing environment, first time only: building the ${recipe.title} image`);
    const pulledByUs = [];
    for (const ref of recipe.upstream || []) {
      if (!(await this.engine.imageExists(ref))) {
        onProgress(`Downloading ${ref}`);
        await this.engine.pullImage(ref, () => {});
        pulledByUs.push(ref);
      }
    }
    const buildargs = { ...(recipe.args || {}), TARGETARCH: arch };
    if (recipe.parent) buildargs.PARENT_IMAGE = this.tagFor(recipe.parent);
    let steps = 0;
    const recent = [];
    await this.engine.buildImage({
      contextDir: path.join(this.root, recipe.dir),
      tag,
      buildargs,
      labels: { [RECIPE_LABEL]: name },
      onProgress: (line) => {
        if (/^Step \d+\/\d+/.test(line)) {
          steps += 1;
          onProgress(`${recipe.title}: ${line.replace(/^Step (\d+\/\d+) :/, 'step $1:').slice(0, 160)}`);
        }
        recent.push(line);
        if (recent.length > 12) recent.shift();
        this.log(`[build ${name}] ${line}`);
      },
    }).catch((err) => {
      // The engine reports the whole failing command; the last output lines say why.
      const why = recent.filter((l) => !/^Step \d+\/\d+/.test(l)).slice(-4).join(' | ');
      throw new Error(`Building the ${recipe.title} image failed${why ? `: ${why}` : ''}`.slice(0, 600));
    });
    // Upstream images we downloaded only to build from are untagged, so the
    // only images left behind are labelled ones owned by the project.
    for (const ref of pulledByUs) await this.engine.removeImage(ref).catch(() => {});
    await this.pruneOld(name, tag);
    onProgress(`Built the ${recipe.title} image`);
    return tag;
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

  async status() {
    const result = {};
    for (const name of Object.keys(this.recipes)) {
      result[name] = await this.engine.imageExists(this.tagFor(name));
    }
    return result;
  }
}
