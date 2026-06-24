import { readFile as defaultReadFile } from 'node:fs/promises';
import { basename, extname } from 'node:path';
import { validationError } from './errors.js';

const MAX_ATTACHMENT_COUNT = 10;
const MAX_ATTACHMENT_TOTAL_SIZE_BYTES = 10 * 1024 * 1024;

const fileOptionPairs = [
  ['text', 'textFile'],
  ['html', 'htmlFile'],
];

export async function resolveRequestBody(options = {}, { readFile = defaultReadFile } = {}) {
  validateBodyInputConflicts(options);

  const body = {};
  for (const [key, value] of Object.entries(options)) {
    if (key.endsWith('File') || key === 'attachment' || value === undefined) {
      continue;
    }
    body[key] = value;
  }

  for (const [field, fileField] of fileOptionPairs) {
    if (options[fileField]) {
      body[field] = await readFile(options[fileField], 'utf8');
    }
  }

  if (options.attachment) {
    body.attachments = await readAttachments(options.attachment, { readFile });
  }

  return body;
}

function validateBodyInputConflicts(options) {
  for (const [field, fileField] of fileOptionPairs) {
    if (options[field] && options[fileField]) {
      throw validationError(`--${kebab(field)} and --${kebab(fileField)} are mutually exclusive`);
    }
  }
}

async function readAttachments(paths, { readFile }) {
  const filePaths = Array.isArray(paths) ? paths : [paths];
  if (filePaths.length > MAX_ATTACHMENT_COUNT) {
    throw validationError('Attachments cannot exceed 10 files.');
  }

  const files = await Promise.all(
    filePaths.map(async (filePath) => {
      const content = await readFile(filePath);
      return { filePath, content };
    }),
  );

  const totalSize = files.reduce((sum, file) => sum + file.content.byteLength, 0);
  if (totalSize > MAX_ATTACHMENT_TOTAL_SIZE_BYTES) {
    throw validationError('Attachments total size cannot exceed 10MB.');
  }

  return files.map(({ filePath, content }) => {
    const filename = basename(filePath);
    const contentType = guessContentType(filename);

    return {
      filename,
      contentType,
      type: contentType,
      content: Buffer.from(content).toString('base64'),
    };
  });
}

function guessContentType(filename) {
  const extension = extname(filename).toLowerCase();

  switch (extension) {
    case '.txt':
      return 'text/plain';
    case '.html':
    case '.htm':
      return 'text/html';
    case '.json':
      return 'application/json';
    case '.pdf':
      return 'application/pdf';
    case '.csv':
      return 'text/csv';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.gif':
      return 'image/gif';
    case '.svg':
      return 'image/svg+xml';
    case '.zip':
      return 'application/zip';
    default:
      return 'application/octet-stream';
  }
}

function kebab(value) {
  return value.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}
