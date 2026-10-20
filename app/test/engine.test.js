// DockerEngine against recorded Docker Engine API streams, with docker-modem's
// real stream handling and no Docker daemon.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import Modem from 'docker-modem';
import { describe, expect, it } from 'vitest';
import { DockerEngine } from '../server/engine.js';

const stream = (events) => Readable.from(events.map((e) => `${JSON.stringify(e)}\r\n`));

function engineWith(docker) {
  const engine = new DockerEngine();
  engine.docker = { modem: new Modem(), ...docker };
  return engine;
}

describe('DockerEngine with a dropped connection', () => {
  it('a download that loses the connection halfway fails instead of looking finished', async () => {
    const reset = 'read tcp 192.168.65.3:51234->104.16.98.215:443: read: connection reset by peer';
    const engine = engineWith({
      pull: async () =>
        stream([
          { status: 'Pulling from library/ubuntu', id: 'resolute-20261006' },
          { status: 'Pulling fs layer', id: 'a1b2c3d4e5f6' },
          { status: 'Downloading', progressDetail: { current: 1048576, total: 29534512 }, id: 'a1b2c3d4e5f6' },
          { errorDetail: { message: reset }, error: reset },
        ]),
    });
    await expect(engine.pullImage('ubuntu:resolute-20261006')).rejects.toThrow(/connection reset by peer/);
  });

  it('a build that fails removes the step images it created, and only those', async () => {
    const removed = [];
    const engine = engineWith({
      buildImage: async () =>
        stream([
          { stream: 'Step 1/5 : FROM devops-labs/base:13c39ba6ea92\n' },
          { stream: ' ---> 9f8e7d6c5b4a\n' },
          { stream: 'Step 2/5 : ARG TERRAFORM_VERSION\n' },
          { stream: ' ---> Using cache\n' },
          { stream: ' ---> 1111aaaa2222\n' },
          { stream: 'Step 3/5 : ARG TARGETARCH\n' },
          { stream: ' ---> Running in 3333bbbb4444\n' },
          { stream: ' ---> Removed intermediate container 3333bbbb4444\n' },
          { stream: ' ---> 5555cccc6666\n' },
          { stream: 'Step 4/5 : ENV TF_IN_AUTOMATION=1\n' },
          { stream: ' ---> Running in 7777dddd8888\n' },
          { stream: ' ---> Removed intermediate container 7777dddd8888\n' },
          { stream: ' ---> 9999eeee0000\n' },
          { stream: 'Step 5/5 : RUN curl -fsSLO https://releases.hashicorp.com/terraform/1.16.6/terraform_1.16.6_linux_amd64.zip\n' },
          { stream: ' ---> Running in abababababab\n' },
          // Docker colours the output of a failing step.
          { stream: '\u001b[91mcurl: (6) Could not resolve host: releases.hashicorp.com\n\u001b[0m' },
          { errorDetail: { code: 6, message: "The command '/bin/sh -c curl' returned a non-zero code: 6" }, error: "The command '/bin/sh -c curl' returned a non-zero code: 6" },
        ]),
      getImage: (id) => ({ remove: async () => removed.push(id) }),
    });
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'devops-labs-build-'));
    fs.writeFileSync(path.join(dir, 'Dockerfile'), 'FROM scratch\n');
    const lines = [];
    await expect(engine.buildImage({ contextDir: dir, tag: 'devops-labs/terraform:test', onProgress: (l) => lines.push(l) })).rejects.toThrow(/non-zero code: 6/);
    expect(lines).toContain('curl: (6) Could not resolve host: releases.hashicorp.com');
    // Newest first; the parent image (FROM) and the cached step are not this build's.
    expect(removed).toEqual(['9999eeee0000', '5555cccc6666']);
  });

  it('builds without a network when asked, to simulate a dropped connection', async () => {
    let options;
    const engine = engineWith({
      buildImage: async (pack, opts) => {
        options = opts;
        return stream([{ stream: 'Step 1/1 : FROM scratch\n' }]);
      },
    });
    engine.buildNetwork = 'devops-labs-offline';
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'devops-labs-build-'));
    fs.writeFileSync(path.join(dir, 'Dockerfile'), 'FROM scratch\n');
    await engine.buildImage({ contextDir: dir, tag: 'x:y' });
    expect(options.networkmode).toBe('devops-labs-offline');
  });
});
