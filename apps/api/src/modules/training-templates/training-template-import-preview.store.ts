import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { ParsedImportPreview } from './training-template-import.parser';

export const TRAINING_TEMPLATE_IMPORT_PREVIEW_TTL_MS = 15 * 60 * 1000;

type PreviewRecord = {
  templateId: string;
  templateUpdatedAt: string;
  createdAt: number;
  payload: ParsedImportPreview;
};

@Injectable()
export class TrainingTemplateImportPreviewStore {
  private readonly previews = new Map<string, PreviewRecord>();

  save(templateId: string, templateUpdatedAt: string, payload: ParsedImportPreview) {
    this.deleteExpiredPreviews();
    const token = randomUUID();
    this.previews.set(token, {
      templateId,
      templateUpdatedAt,
      createdAt: Date.now(),
      payload,
    });
    return token;
  }

  consume(token: string, maxAgeMs = TRAINING_TEMPLATE_IMPORT_PREVIEW_TTL_MS) {
    this.deleteExpiredPreviews(maxAgeMs);
    const preview = this.previews.get(token);
    if (!preview) {
      return null;
    }

    this.previews.delete(token);
    return preview;
  }

  private deleteExpiredPreviews(maxAgeMs = TRAINING_TEMPLATE_IMPORT_PREVIEW_TTL_MS) {
    const now = Date.now();
    for (const [token, preview] of this.previews.entries()) {
      if (now - preview.createdAt > maxAgeMs) {
        this.previews.delete(token);
      }
    }
  }
}
