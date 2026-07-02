import { readFile as defaultReadFile } from 'node:fs/promises';
import { basename, extname } from 'node:path';
import { validationError } from './errors.js';

const MAX_ATTACHMENT_COUNT = 10;
const MAX_ATTACHMENT_TOTAL_SIZE_BYTES = 10 * 1024 * 1024;
const VALID_ATTACHMENT_DISPOSITIONS = new Set(['attachment', 'inline']);
const ATTACHMENT_METADATA_KEYS = new Set(['disposition', 'content_id', 'content-id']);

const fileOptionPairs = [
  ['text', 'textFile'],
  ['html', 'htmlFile'],
];

export async function resolveRequestBody(options = {}, { readFile = defaultReadFile } = {}) {
  validateBodyInputConflicts(options);

  const body = {};
  for (const [key, value] of Object.entries(options)) {
    if (key.endsWith('File') || ['attachment', 'disposition', 'contentId'].includes(key) || value === undefined) {
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
    body.attachments = await readAttachments(options.attachment, {
      contentIds: options.contentId,
      dispositions: options.disposition,
      readFile,
    });
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

async function readAttachments(paths, { contentIds, dispositions, readFile }) {
  const attachmentInputs = normalizeList(paths).map(parseAttachmentInput);
  if (attachmentInputs.length > MAX_ATTACHMENT_COUNT) {
    throw validationError('Attachments cannot exceed 10 files.');
  }

  const dispositionValues = normalizeList(dispositions);
  const contentIdValues = normalizeList(contentIds);
  validateAttachmentMetadataStyle(attachmentInputs, dispositionValues, contentIdValues);
  validateAttachmentMetadataCounts(attachmentInputs, dispositionValues, contentIdValues);

  const files = await Promise.all(
    attachmentInputs.map(async (attachmentInput, index) => {
      const content = await readFile(attachmentInput.filePath);
      const encodedContent = Buffer.from(content).toString('base64');
      const filename = basename(attachmentInput.filePath);
      const disposition = resolveAttachmentDisposition(attachmentInput, dispositionValues, index, attachmentInputs.length);
      const contentId = resolveAttachmentContentId(attachmentInput, contentIdValues, index, attachmentInputs.length);
      validateAttachmentMetadata({ contentId, filename, disposition });
      return { filePath: attachmentInput.filePath, content, encodedContent, disposition, contentId };
    }),
  );

  const totalSize = files.reduce((sum, file) => sum + file.content.byteLength, 0);
  if (totalSize > MAX_ATTACHMENT_TOTAL_SIZE_BYTES) {
    throw validationError('Attachments total size cannot exceed 10MB.');
  }

  const encodedTotalSize = files.reduce((sum, file) => sum + Buffer.byteLength(file.encodedContent, 'utf8'), 0);
  if (encodedTotalSize > MAX_ATTACHMENT_TOTAL_SIZE_BYTES) {
    throw validationError('Attachments encoded size cannot exceed 10MB. Keep combined raw attachments below about 7.5MB before sending.');
  }

  return files.map(({ filePath, encodedContent, disposition, contentId }) => {
    const attachment = {
      filename: basename(filePath),
      content: encodedContent,
      disposition,
    };

    if (contentId) {
      attachment.content_id = contentId;
    }

    return attachment;
  });
}

function parseAttachmentInput(value) {
  const parts = String(value).split(';');
  const filePath = parts.shift();
  const metadata = {};

  for (const part of parts) {
    const separatorIndex = part.indexOf('=');
    if (separatorIndex === -1) {
      throw validationError('Attachment metadata must use key=value after semicolons.');
    }

    const key = part.slice(0, separatorIndex).trim();
    const metadataValue = part.slice(separatorIndex + 1).trim();
    if (!ATTACHMENT_METADATA_KEYS.has(key)) {
      throw validationError(`Unsupported attachment metadata key: ${key}.`);
    }
    if (!metadataValue) {
      throw validationError(`Attachment metadata ${key} cannot be empty.`);
    }

    if (key === 'disposition') {
      metadata.disposition = metadataValue;
    } else {
      metadata.contentId = metadataValue;
    }
  }

  return { filePath, metadata };
}

function validateAttachmentMetadataStyle(attachmentInputs, dispositions, contentIds) {
  const hasInlineMetadata = attachmentInputs.some(
    (attachmentInput) => attachmentInput.metadata.disposition || attachmentInput.metadata.contentId,
  );
  if (hasInlineMetadata && (dispositions.length > 0 || contentIds.length > 0)) {
    throw validationError('Do not mix attachment inline metadata with --disposition or --content-id.');
  }
}

function validateAttachmentMetadataCounts(attachmentInputs, dispositions, contentIds) {
  const usesInlineMetadata = attachmentInputs.some(
    (attachmentInput) => attachmentInput.metadata.disposition || attachmentInput.metadata.contentId,
  );
  if (usesInlineMetadata) return;

  if (dispositions.length === 0) {
    throw validationError('--disposition is required when using --attachment.');
  }
  if (dispositions.length !== 1 && dispositions.length !== attachmentInputs.length) {
    throw validationError('--disposition must be provided once or repeated for each attachment.');
  }
  if (contentIds.length > 1 && contentIds.length !== attachmentInputs.length) {
    throw validationError('--content-id must be provided once or repeated for each attachment.');
  }
}

function resolveAttachmentDisposition(attachmentInput, dispositions, index, attachmentCount) {
  const disposition = attachmentInput.metadata.disposition
    ?? (dispositions.length === attachmentCount ? dispositions[index] : dispositions[0]);
  if (!VALID_ATTACHMENT_DISPOSITIONS.has(disposition)) {
    throw validationError('--disposition must be either attachment or inline.');
  }
  return disposition;
}

function resolveAttachmentContentId(attachmentInput, contentIds, index, attachmentCount) {
  if (attachmentInput.metadata.contentId) return attachmentInput.metadata.contentId;
  if (contentIds.length === 0) return undefined;
  return contentIds.length === attachmentCount ? contentIds[index] : contentIds[0];
}

function validateAttachmentMetadata({ contentId, filename, disposition }) {
  if (contentId && disposition !== 'inline') {
    throw validationError('--content-id can only be used when --disposition is inline.');
  }
  if (disposition === 'inline' && isImageFile(filename) && !contentId) {
    throw validationError('--content-id is required for inline image attachments.');
  }
}

function normalizeList(value) {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function isImageFile(filename) {
  const extension = extname(filename).toLowerCase();
  return ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp'].includes(extension);
}

function kebab(value) {
  return value.replace(/[A-Z]/g, (match) => '-' + match.toLowerCase());
}
