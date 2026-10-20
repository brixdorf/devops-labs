// In-memory stand-in for DockerEngine, used by unit and API tests.
import { PassThrough } from 'node:stream';

function matches(labels = {}, filter = {}) {
  return Object.entries(filter).every(([k, v]) => (v === undefined ? k in labels : labels[k] === v));
}

export class FakeEngine {
  constructor() {
    this.images = new Set();
    this.containers = new Map();
    this.networks = new Map();
    this.volumes = new Map();
    this.files = new Map();
    this.execLog = [];
    this.builds = [];
    this.buildOptions = [];
    this.pulls = [];
    this.imageRuns = [];
    // Hook to customise image check results: (image, cmd) => result | undefined
    this.runHandler = null;
    // Hook run during a build, before the image exists; it can throw to fail the build.
    this.buildHandler = null;
    this.nextId = 1;
    // Hook to customise exec results: (containerName, cmd, opts) => result | undefined
    this.execHandler = null;
    this.ttys = [];
  }

  id() {
    return `id${this.nextId++}`.padEnd(64, '0');
  }

  async ping() {
    return true;
  }

  async info() {
    return { arch: 'amd64' };
  }

  async imageExists(ref) {
    return this.images.has(ref);
  }

  async imageInspect(ref) {
    return this.images.has(ref) ? { Id: ref } : null;
  }

  async pullImage(ref) {
    this.pulls.push(ref);
    this.images.add(ref);
  }

  async removeImage(ref) {
    return this.images.delete(ref);
  }

  async listImages() {
    return [];
  }

  async buildImage({ tag, onProgress, ...options }) {
    this.builds.push(tag);
    this.buildOptions.push({ tag, ...options });
    onProgress?.('Step 1/1 : FROM scratch');
    if (this.buildHandler) await this.buildHandler({ tag, onProgress, ...options });
    this.images.add(tag);
  }

  async runImage(image, cmd) {
    this.imageRuns.push({ image, cmd });
    return { exitCode: 0, output: '', ...(this.runHandler?.(image, cmd) || {}) };
  }

  async createNetwork(name, labels = {}) {
    const id = this.id();
    this.networks.set(id, { Id: id, Name: name, Labels: labels });
    return id;
  }

  async removeNetwork(idOrName) {
    for (const [id, n] of this.networks) {
      if (id === idOrName || n.Name === idOrName) {
        this.networks.delete(id);
        return true;
      }
    }
    return false;
  }

  async listNetworks(filter) {
    return [...this.networks.values()].filter((n) => matches(n.Labels, filter));
  }

  async createVolume(name, labels = {}) {
    this.volumes.set(name, { Name: name, Labels: labels });
    return name;
  }

  async volumeExists(name) {
    return this.volumes.has(name);
  }

  async removeVolume(name) {
    return this.volumes.delete(name);
  }

  async listVolumes(filter) {
    return [...this.volumes.values()].filter((v) => matches(v.Labels, filter));
  }

  async createContainer(spec) {
    const id = this.id();
    this.containers.set(id, { Id: id, Names: [`/${spec.name}`], Labels: spec.Labels || {}, spec, running: false });
    return id;
  }

  async startContainer(id) {
    const c = this.containers.get(id);
    if (!c) throw new Error('no such container');
    c.running = true;
  }

  async removeContainer(id) {
    return this.containers.delete(id);
  }

  async inspectContainer(id) {
    return this.containers.get(id) || null;
  }

  async listContainers(filter) {
    return [...this.containers.values()].filter((c) => matches(c.Labels, filter));
  }

  async containerLogs() {
    return '';
  }

  async putFiles(id, dir, files) {
    if (!this.containers.has(id)) throw new Error('no such container');
    for (const f of files) this.files.set(`${id}:${dir}/${f.name}`, String(f.content));
  }

  roleOf(id) {
    return this.containers.get(id)?.Labels?.['org.devopslabs.role'];
  }

  async exec(id, opts) {
    if (!this.containers.has(id)) throw new Error('no such container');
    const role = this.roleOf(id);
    this.execLog.push({ role, cmd: opts.cmd, user: opts.user });
    const custom = this.execHandler?.(role, opts.cmd, opts);
    if (custom) return { exitCode: 0, stdout: '', stderr: '', timedOut: false, ...(await custom) };
    if (opts.cmd[0] === 'cat') return { exitCode: 1, stdout: '', stderr: 'No such file', timedOut: false };
    return { exitCode: 0, stdout: '', stderr: '', timedOut: false };
  }

  async execTty(id, opts) {
    if (!this.containers.has(id)) throw new Error('no such container');
    // A duplex-ish stream: what the terminal writes goes to `input`, and the
    // test pushes shell output through `stream.push`.
    const stream = new PassThrough();
    const input = [];
    const tty = { id, opts, input, stream, resizes: [] };
    const originalWrite = stream.write.bind(stream);
    stream.write = (data) => {
      input.push(String(data));
      return true;
    };
    stream.emitOutput = (text) => originalWrite(text);
    this.ttys.push(tty);
    return { stream, resize: async (c, r) => tty.resizes.push([c, r]) };
  }

  async listBuildCache() {
    return [];
  }

  async pruneBuildCache() {}
}
