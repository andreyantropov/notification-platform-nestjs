import os from 'os';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import {
  ATTR_SERVER_ADDRESS,
  ATTR_SERVER_PORT,
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import pkg from '../../../package.json';
import FastifyOtelInstrumentation from '@fastify/otel';
import { PinoInstrumentation } from '@opentelemetry/instrumentation-pino';

const otelSDK = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: 'notification-platform.receive-service',
    [ATTR_SERVICE_VERSION]: pkg.version,
    [ATTR_SERVER_ADDRESS]: os.hostname(),
    [ATTR_SERVER_PORT]: Number(process.env.PORT) || 3000,
    'deployment.environment': process.env.NODE_ENV,
  }),

  contextManager: new AsyncLocalStorageContextManager(),
  textMapPropagator: new W3CTraceContextPropagator(),

  spanProcessor: new BatchSpanProcessor(
    new OTLPTraceExporter({ url: process.env.TRACES_EXPORTER_URL }),
  ),
  logRecordProcessor: new BatchLogRecordProcessor({
    exporter: new OTLPLogExporter({ url: process.env.LOGS_EXPORTER_URL }),
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({ url: process.env.METRICS_EXPORTER_URL }),
  }),

  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
      '@opentelemetry/instrumentation-http': { enabled: false },
    }),
    new FastifyOtelInstrumentation({
      registerOnInitialization: true,
    }),
    new PinoInstrumentation(),
  ],
});

otelSDK.start();

['SIGTERM', 'SIGINT'].forEach((signal) => {
  process.on(signal, () => {
    otelSDK.shutdown().catch(() => {
      process.exit(1);
    });
  });
});
