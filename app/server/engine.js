// Thin wrapper around the Docker Engine API. Everything the app does with
// Docker goes through this class, so tests can swap in a fake engine.
import Docker from 'dockerode';
import fs from 'node:fs';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import tar from 'tar-stream';
import { PROJECT_LABEL, PROJECT_VALUE } from './config.js';

function labelFilter(labels) {
  return Object.entries(labels).map(([k, v]) => (v === undefined ? k : `${k}=${v}`));
}

function isNotFound(err) {
  return err?.statusCode === 404;
}

export class DockerEngine {
  constructor(options = {}) {
    this.docker = new Docker(options.socketPath ? { socketPath: options.socketPath } : undefined);
  }

  async ping() {
    await this.docker.ping();
    return true;
  }

  async info() {
    const info = await this.docker.info();
    const arch = /aarch64|arm64/i.test(info.Architecture) ? 'arm64' : 'amd64';
    return { arch, memTotal: info.MemTotal, operatingSystem: info.OperatingSystem };
  }

  // Images

  async imageExists(ref) {
    try {
      await this.docker.getImage(ref).inspect();
      return true;
    } catch (err) {
      if (isNotFound(err)) return false;
      throw err;
    }
  }

  async imageInspect(ref) {
    try {
      return await this.docker.getImage(ref).inspect();
    } catch (err) {
      if (isNotFound(err)) return null;
      throw err;
    }
  }

  async pullImage(ref, onProgress = () => {}) {
    const stream = await this.docker.pull(ref);
    await new Promise((resolve, reject) => {
      this.docker.modem.followProgress(
        stream,
        (err) => (err ? reject(err) : resolve()),
        (event) => {
          if (event.status && !event.progressDetail?.current) onProgress(`${event.status}${event.id ? ` ${event.id}` : ''}`);
        },
      );
    });
  }

  async removeImage(ref, { force = false } = {}) {
    try {
      await this.docker.getImage(ref).remove({ force, noprune: false });
      return true;
    } catch (err) {
      if (isNotFound(err)) return false;
      throw err;
    }
  }

  async tagImage(ref, repo, tag) {
    await this.docker.getImage(ref).tag({ repo, tag });
  }

  async listImages(labels = {}) {
    return this.docker.listImages({ all: false, filters: { label: labelFilter(labels) } });
  }

  // Builds an image from a directory with the classic builder. Build steps
  // are streamed to onProgress line by line.
  async buildImage({ contextDir, tag, buildargs = {}, labels = {}, onProgress = () => {} }) {
    const pack = await packDirectory(contextDir);
    const stream = await this.docker.buildImage(pack, {
      t: tag,
      buildargs,
      labels: { [PROJECT_LABEL]: PROJECT_VALUE, ...labels },
      rm: true,
      forcerm: true,
      version: '1',
    });
    await new Promise((resolve, reject) => {
      let failure = null;
      this.docker.modem.followProgress(
        stream,
        (err) => (err || failure ? reject(err || new Error(failure)) : resolve()),
        (event) => {
          if (event.error) failure = event.error;
          if (event.stream) {
            for (const line of event.stream.split('\n')) if (line.trim()) onProgress(line.trimEnd());
          } else if (event.status && !event.progressDetail?.current) {
            onProgress(`${event.status}${event.id ? ` ${event.id}` : ''}`);
          }
        },
      );
    });
  }

  // Networks

  async createNetwork(name, labels = {}) {
    const network = await this.docker.createNetwork({
      Name: name,
      Driver: 'bridge',
      CheckDuplicate: true,
      Labels: { [PROJECT_LABEL]: PROJECT_VALUE, ...labels },
    });
    return network.id;
  }

  async removeNetwork(idOrName) {
    try {
      await this.docker.getNetwork(idOrName).remove();
      return true;
    } catch (err) {
      if (isNotFound(err)) return false;
      throw err;
    }
  }

  async listNetworks(labels = {}) {
    return this.docker.listNetworks({ filters: { label: labelFilter(labels) } });
  }

  // Volumes

  async createVolume(name, labels = {}) {
    await this.docker.createVolume({ Name: name, Labels: { [PROJECT_LABEL]: PROJECT_VALUE, ...labels } });
    return name;
  }

  async volumeExists(name) {
    try {
      await this.docker.getVolume(name).inspect();
      return true;
    } catch (err) {
      if (isNotFound(err)) return false;
      throw err;
    }
  }

  async removeVolume(name) {
    try {
      await this.docker.getVolume(name).remove({ force: true });
      return true;
    } catch (err) {
      if (isNotFound(err)) return false;
      throw err;
    }
  }

  async listVolumes(labels = {}) {
    const result = await this.docker.listVolumes({ filters: { label: labelFilter(labels) } });
    return result.Volumes || [];
  }

  // Containers

  async createContainer(spec) {
    const container = await this.docker.createContainer(spec);
    return container.id;
  }

  async startContainer(id) {
    await this.docker.getContainer(id).start();
  }

  async removeContainer(id) {
    try {
      await this.docker.getContainer(id).remove({ force: true, v: true });
      return true;
    } catch (err) {
      if (isNotFound(err)) return false;
      throw err;
    }
  }

  async inspectContainer(id) {
    try {
      return await this.docker.getContainer(id).inspect();
    } catch (err) {
      if (isNotFound(err)) return null;
      throw err;
    }
  }

  async listContainers(labels = {}) {
    return this.docker.listContainers({ all: true, filters: { label: labelFilter(labels) } });
  }

  async containerLogs(id, tail = 50) {
    const buf = await this.docker.getContainer(id).logs({ stdout: true, stderr: true, tail });
    return demuxBuffer(buf);
  }

  // Copies files into a container. files: [{ name, content, mode }]
  async putFiles(id, destDir, files) {
    const pack = tar.pack();
    for (const file of files) {
      pack.entry({ name: file.name, mode: file.mode ?? 0o644, uid: file.uid ?? 0, gid: file.gid ?? 0 }, file.content);
    }
    pack.finalize();
    await this.docker.getContainer(id).putArchive(pack, { path: destDir });
  }

  // Runs a command to completion and collects its output.
  async exec(id, { cmd, user = 'root', env = [], workdir, timeoutMs = 120000, stdin } = {}) {
    const container = this.docker.getContainer(id);
    const exec = await container.exec({
      Cmd: cmd,
      User: user,
      Env: env,
      WorkingDir: workdir,
      AttachStdout: true,
      AttachStderr: true,
      AttachStdin: stdin !== undefined,
      Tty: false,
    });
    const stream = await exec.start({ hijack: true, stdin: stdin !== undefined });
    const stdout = new PassThrough();
    const stderr = new PassThrough();
    const out = [];
    const err = [];
    stdout.on('data', (d) => out.push(d));
    stderr.on('data', (d) => err.push(d));
    this.docker.modem.demuxStream(stream, stdout, stderr);
    if (stdin !== undefined) {
      stream.write(stdin);
      stream.end();
    }
    let timer;
    const finished = new Promise((resolve) => {
      stream.on('end', resolve);
      stream.on('close', resolve);
      stream.on('error', resolve);
    });
    const timedOut = await Promise.race([
      finished.then(() => false),
      new Promise((resolve) => {
        timer = setTimeout(() => resolve(true), timeoutMs);
      }),
    ]);
    clearTimeout(timer);
    if (timedOut) stream.destroy();
    let exitCode = -1;
    for (let i = 0; i < 50; i += 1) {
      const info = await exec.inspect();
      if (!info.Running) {
        exitCode = info.ExitCode;
        break;
      }
      if (timedOut) break;
      await new Promise((r) => setTimeout(r, 50));
    }
    return {
      exitCode: timedOut ? 124 : exitCode,
      stdout: Buffer.concat(out).toString('utf8'),
      stderr: Buffer.concat(err).toString('utf8'),
      timedOut,
    };
  }

  // Starts an interactive TTY exec for a browser terminal.
  async execTty(id, { cmd, user = 'root', env = [], workdir, cols = 80, rows = 24 }) {
    const exec = await this.docker.getContainer(id).exec({
      Cmd: cmd,
      User: user,
      Env: env,
      WorkingDir: workdir,
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      Tty: true,
      ConsoleSize: [rows, cols],
    });
    const stream = await exec.start({ hijack: true, stdin: true, Tty: true });
    return {
      stream,
      resize: async (c, r) => {
        try {
          await exec.resize({ w: c, h: r });
        } catch {
          // The exec may already have ended.
        }
      },
    };
  }

  // Build cache records whose description matches a pattern.
  async listBuildCache() {
    const df = await this.docker.df({ type: 'build-cache' }).catch(() => this.docker.df());
    return df.BuildCache || [];
  }

  async pruneBuildCache(ids) {
    if (!ids.length) return;
    await this.docker.pruneBuilder({ all: true, filters: JSON.stringify({ id: ids }) }).catch(() => {});
  }
}

function demuxBuffer(buf) {
  // Docker multiplexes stdout and stderr with an 8 byte header per frame.
  if (!Buffer.isBuffer(buf)) return String(buf);
  const parts = [];
  let offset = 0;
  while (offset + 8 <= buf.length) {
    const size = buf.readUInt32BE(offset + 4);
    parts.push(buf.subarray(offset + 8, offset + 8 + size));
    offset += 8 + size;
  }
  return parts.length ? Buffer.concat(parts).toString('utf8') : buf.toString('utf8');
}

// Packs a build context directory into a tar stream. Contexts are small,
// curated folders, so no ignore rules are applied.
export async function packDirectory(dir, extraFiles = []) {
  const pack = tar.pack();
  const walk = async (current, prefix) => {
    const entries = (await fs.promises.readdir(current, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      const name = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await walk(full, name);
      } else if (entry.isFile()) {
        const stat = await fs.promises.stat(full);
        const content = await fs.promises.readFile(full);
        await new Promise((resolve, reject) => {
          pack.entry({ name, mode: stat.mode & 0o777, mtime: new Date(0) }, content, (err) => (err ? reject(err) : resolve()));
        });
      }
    }
  };
  await walk(dir, '');
  for (const file of extraFiles) {
    await new Promise((resolve, reject) => {
      pack.entry({ name: file.name, mode: file.mode ?? 0o644, mtime: new Date(0) }, file.content, (err) => (err ? reject(err) : resolve()));
    });
  }
  pack.finalize();
  return pack;
}

// Packs in-memory files ({ name, content, mode }) into a tar stream.
export function packFiles(files) {
  const pack = tar.pack();
  for (const file of files) pack.entry({ name: file.name, mode: file.mode ?? 0o644, mtime: new Date(0) }, file.content);
  pack.finalize();
  return pack;
}
