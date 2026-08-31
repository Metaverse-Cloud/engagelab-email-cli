import { randomUUID } from 'node:crypto';
import { readConfig, writeConfig } from '../config/config-store.js';

const CLIENT_NAME = 'engagelab-email-cli';

export async function loadCliTelemetry({ read = readConfig, write = writeConfig } = {}) {
  if (process.env.ENGAGELAB_EMAIL_TELEMETRY_DISABLED === '1') {
    return disabledTelemetry();
  }

  const config = await read();
  const existing = config.telemetry && typeof config.telemetry === 'object' ? config.telemetry : {};
  const deviceId = existing.deviceId || randomUUID();
  const storage = { ...config, telemetry: { ...existing, deviceId } };
  if (!existing.deviceId) {
    try {
      await write(storage);
    } catch {
      // Telemetry state is best effort and must not affect email operations.
    }
  }

  let initializationPending = !existing.initializedAt;
  return {
    enabled: true,
    deviceId,
    headers(version) {
      return {
        'X-EngageLab-SDK-Name': CLIENT_NAME,
        'X-EngageLab-SDK-Version': version,
        'X-EngageLab-SDK-Device-ID': deviceId,
        ...(initializationPending ? { 'X-EngageLab-SDK-Init': '1' } : {}),
      };
    },
    async markInitialized() {
      if (!initializationPending) return;
      initializationPending = false;
      try {
        const latest = await read();
        await write({
          ...latest,
          telemetry: {
            ...(latest.telemetry && typeof latest.telemetry === 'object' ? latest.telemetry : {}),
            deviceId,
            initializedAt: new Date().toISOString(),
          },
        });
      } catch {
        // Telemetry state is best effort and must not affect email operations.
      }
    },
  };
}

function disabledTelemetry() {
  return {
    enabled: false,
    deviceId: undefined,
    headers: () => ({}),
    markInitialized: async () => undefined,
  };
}

export const telemetryClientName = CLIENT_NAME;
