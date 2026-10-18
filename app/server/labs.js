// Loads topics and labs from the labs folder and validates their structure.
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

export const ENVIRONMENT_NAMES = ['base', 'systemd', 'docker', 'kubernetes', 'terraform'];
export const ADDON_NAMES = ['gitea', 'registry', 'moto', 'prometheus', 'grafana', 'argocd'];
export const REQUIRED_FILES = ['lab.yaml', 'question.md', 'hint.md', 'approach.md', 'solution.md', 'setup.sh', 'check.py', 'solve.sh'];

function readYaml(file) {
  return YAML.parse(fs.readFileSync(file, 'utf8'));
}

// Validates one lab folder. Returns a list of problems (empty when valid).
export function validateLab(dir, meta, topic) {
  const problems = [];
  for (const name of REQUIRED_FILES) {
    const file = path.join(dir, name);
    if (!fs.existsSync(file)) problems.push(`missing ${name}`);
    else if (fs.statSync(file).size === 0) problems.push(`${name} is empty`);
  }
  if (!meta || typeof meta !== 'object') return [...problems, 'lab.yaml is not a mapping'];
  for (const key of ['id', 'title', 'topic', 'order', 'environment']) {
    if (meta[key] === undefined || meta[key] === '') problems.push(`lab.yaml is missing "${key}"`);
  }
  if (meta.id && !/^[a-z0-9][a-z0-9-]*$/.test(meta.id)) problems.push('id must be lowercase letters, digits and dashes');
  if (topic && meta.topic !== topic.id) problems.push(`topic "${meta.topic}" does not match folder topic "${topic.id}"`);
  if (meta.environment && !ENVIRONMENT_NAMES.includes(meta.environment)) problems.push(`unknown environment "${meta.environment}"`);
  for (const addon of meta.addons || []) {
    if (!ADDON_NAMES.includes(addon)) problems.push(`unknown add-on "${addon}"`);
  }
  if (meta.addons?.includes('argocd') && meta.environment !== 'kubernetes') problems.push('argocd needs the kubernetes environment');
  if (meta.maxScore !== undefined && !(Number.isInteger(meta.maxScore) && meta.maxScore > 0)) problems.push('maxScore must be a positive integer');
  for (const svc of meta.services || []) {
    if (!svc.name || !/^[a-z0-9-]+$/.test(svc.name)) problems.push('each service needs a lowercase name');
    if (svc.files && !fs.existsSync(path.join(dir, svc.files))) problems.push(`service files folder ${svc.files} not found`);
  }
  return problems;
}

export function loadCatalog(labsDir) {
  const topics = [];
  const labs = new Map();
  const problems = [];
  const topicDirs = fs
    .readdirSync(labsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(labsDir, d.name, 'topic.yaml')))
    .map((d) => d.name)
    .sort();
  for (const topicDirName of topicDirs) {
    const topicDir = path.join(labsDir, topicDirName);
    const topicMeta = readYaml(path.join(topicDir, 'topic.yaml'));
    const topic = { id: topicMeta.id, name: topicMeta.name, order: topicMeta.order, description: topicMeta.description || '', labs: [] };
    const labDirs = fs
      .readdirSync(topicDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
    for (const labDirName of labDirs) {
      const dir = path.join(topicDir, labDirName);
      const metaFile = path.join(dir, 'lab.yaml');
      if (!fs.existsSync(metaFile)) {
        problems.push(`${topicDirName}/${labDirName}: missing lab.yaml`);
        continue;
      }
      let meta;
      try {
        meta = readYaml(metaFile);
      } catch (err) {
        problems.push(`${topicDirName}/${labDirName}: lab.yaml is invalid (${err.message})`);
        continue;
      }
      const labProblems = validateLab(dir, meta, topic);
      if (labProblems.length) {
        problems.push(...labProblems.map((p) => `${topicDirName}/${labDirName}: ${p}`));
        continue;
      }
      if (labs.has(meta.id)) {
        problems.push(`${topicDirName}/${labDirName}: duplicate lab id ${meta.id}`);
        continue;
      }
      const lab = {
        id: meta.id,
        title: meta.title,
        topic: topic.id,
        order: meta.order,
        environment: meta.environment,
        addons: meta.addons || [],
        services: meta.services || [],
        maxScore: meta.maxScore || 50,
        timeouts: { setup: 600, check: 180, solve: 900, ...(meta.timeouts || {}) },
        dir,
      };
      labs.set(lab.id, lab);
      topic.labs.push(lab);
    }
    topic.labs.sort((a, b) => a.order - b.order);
    topics.push(topic);
  }
  topics.sort((a, b) => a.order - b.order);
  return { topics, labs, problems };
}

export function readLabText(lab, name, vars = {}) {
  const text = fs.readFileSync(path.join(lab.dir, name), 'utf8');
  return text.replace(/\{\{\s*([A-Z_]+)\s*\}\}/g, (match, key) => (key in vars ? String(vars[key]) : match));
}

// Lists the files in a lab folder that are copied into the container for setup.
export function labSetupFiles(lab) {
  const files = [{ name: 'setup.sh', content: fs.readFileSync(path.join(lab.dir, 'setup.sh')), mode: 0o755 }];
  const assets = path.join(lab.dir, 'files');
  if (fs.existsSync(assets)) {
    const walk = (current, prefix) => {
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const full = path.join(current, entry.name);
        const name = `${prefix}/${entry.name}`;
        if (entry.isDirectory()) walk(full, name);
        else files.push({ name, content: fs.readFileSync(full), mode: fs.statSync(full).mode & 0o777 });
      }
    };
    walk(assets, 'files');
  }
  return files;
}
