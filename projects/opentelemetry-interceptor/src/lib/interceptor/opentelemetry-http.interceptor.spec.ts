import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import {
  HTTP_INTERCEPTORS,
  HttpClient,
  HttpHeaders,
  HttpErrorResponse,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { OpenTelemetryHttpInterceptor } from './opentelemetry-http.interceptor';
import {
  OTEL_CUSTOM_SPAN,
  OpenTelemetryConfig,
  OTEL_CONFIG,
} from '../configuration/opentelemetry-config';
import {
  otelcolExporterConfig,
  otelcolExporterWithProbabilitySamplerAndCompositeConfig,
  otelcolExporterWithProbabilitySamplerAtZeroAndCompositeConfig,
  otelcolExporterWithProbabilitySamplerAtTwoConfig,
  otelcolExporterProductionConfig,
  otelcolExporterProductionAndBatchSpanProcessorConfig,
  otelTraceparentIgnoreUrlsConfig,
} from '../../../__mocks__/data/config.mock';
import { of } from 'rxjs';
import { ConsoleSpanExporterModule } from '../services/exporter/console/console-span-exporter.module';
// eslint-disable-next-line max-len
import { W3CTraceContextPropagatorModule } from '../services/propagator/w3c-trace-context-propagator/w3c-trace-context-propagator.module';
import { CustomSpan } from './custom-span.interface';
import { Span } from '@opentelemetry/api';
import { NoopSpanExporterModule } from '../services/exporter/noop-exporter/noop-span-exporter.module';

describe('OpenTelemetryHttpInterceptor', () => {
  let httpClient: HttpClient;
  let httpControllerMock: HttpTestingController;
  beforeEach(() => {
    ({ httpClient, httpControllerMock } = defineModuleTest(
      httpClient,
      httpControllerMock,
      otelcolExporterConfig
    ));
  });
  it('should be created', () => {
    const interceptor = TestBed.inject(OpenTelemetryHttpInterceptor);
    expect(interceptor).toBeTruthy();
  });

  it('Add traceparent header on a given request', () => {
    const url = 'http://url.test.com';
    httpClient.get(url).subscribe();
    const req = httpControllerMock.expectOne(url);
    expect(req.request.headers).not.toBeNull();
    expect(req.request.headers.get('traceparent')).not.toBeNull();
    req.flush({});
    httpControllerMock.verify();
  });

  it('Should accept pathname', () => {
    const url = '/api/v1/test?key=value';
    httpClient.get(url).subscribe();
    const req = httpControllerMock.expectOne(url);
    expect(req.request.url).not.toBeNull();
    req.flush({});
    httpControllerMock.verify();
  });

  it('verify with production mode', () => {
    ({ httpClient, httpControllerMock } = defineModuleTest(
      httpClient,
      httpControllerMock,
      otelcolExporterProductionConfig
    ));

    const url = 'http://url.test.com';
    httpClient.get(url).subscribe();
    const req = httpControllerMock.expectOne(url);
    expect(req.request.headers).not.toBeNull();
    expect(req.request.headers.get('traceparent')).not.toBeNull();
    req.flush({});
    httpControllerMock.verify();
  });

  it('Add traceparent header on a given request with already presents headers', () => {
    const url = 'http://url.test.com';
    const headers: HttpHeaders = new HttpHeaders({
      oneHead: 'oneValue',
      twoHead: 'twoValue',
    });
    httpClient.get(url, { headers }).subscribe();
    const req = httpControllerMock.expectOne(url);
    expect(req.request.headers.get('traceparent')).not.toBeNull();
    expect(req.request.headers.get('oneHead')).toEqual('oneValue');
    expect(req.request.headers.get('twoHead')).toEqual('twoValue');
    req.flush({});
    httpControllerMock.verify();
  });

  it('Add traceparent header on a given request with an error', () => {
    const url = 'http://url.test.com';
    httpClient.get(url).subscribe(
      (actualError) => {
        expect(of(actualError)).toBeTruthy();
        expect(actualError).not.toBeNull();
        expect(actualError).not.toBeUndefined();
      },
    );
    const req = httpControllerMock.expectOne(url);
    expect(req.request.method).toEqual('GET');

    req.flush(
      { errorMessage: 'error' },
      { status: 500, statusText: 'Server Error' }
    );
    httpControllerMock.verify();
  });

  it('Add traceparent header on a JsonP given request (not working really...)', () => {
    const url = 'http://url.test.com';
    httpClient.jsonp(url + '/test', 'myCallback').subscribe();
    const req = httpControllerMock.expectOne({
      method: 'JSONP',
      url: url + '/test?myCallback=JSONP_CALLBACK',
    });
    expect(req.request.headers.get('traceparent')).not.toBeNull();
    req.flush({});
    httpControllerMock.verify();
  });

  it('Exclude traceparent header on a given request that is included in the ignoreUrls array', () => {
    ({ httpClient, httpControllerMock } = defineModuleTest(
      httpClient,
      httpControllerMock,
      otelTraceparentIgnoreUrlsConfig
    ));
    const url = 'http://url.test.com';
    httpClient.get(url).subscribe();
    const req = httpControllerMock.expectOne(url);
    expect(req.request.headers).not.toBeNull();
    expect(req.request.headers.get('traceparent')).toBeNull();
    req.flush({});
    httpControllerMock.verify();
  });

  it('verify probability sampler to be add', () => {
    ({ httpClient, httpControllerMock } = defineModuleTest(
      httpClient,
      httpControllerMock,
      otelcolExporterWithProbabilitySamplerAndCompositeConfig
    ));

    const url = 'http://url.test.com';
    httpClient.get(url).subscribe();
    const req = httpControllerMock.expectOne(url);
    expect(req.request.headers.get('traceparent')).not.toBeNull();
    req.flush({});
    httpControllerMock.verify();
  });

  it('verify probability sampler to be add at zero', () => {
    ({ httpClient, httpControllerMock } = defineModuleTest(
      httpClient,
      httpControllerMock,
      otelcolExporterWithProbabilitySamplerAtZeroAndCompositeConfig
    ));

    const url = 'http://url.test.com';
    httpClient.get(url).subscribe();
    const req = httpControllerMock.expectOne(url);
    expect(req.request.headers.get('traceparent')).not.toBeNull();
    req.flush({});
    httpControllerMock.verify();
  });
  it('verify probability sampler to be add at one', () => {
    ({ httpClient, httpControllerMock } = defineModuleTest(
      httpClient,
      httpControllerMock,
      otelcolExporterWithProbabilitySamplerAtTwoConfig
    ));

    const url = 'http://url.test.com';
    httpClient.get(url).subscribe();
    const req = httpControllerMock.expectOne(url);
    expect(req.request.headers.get('traceparent')).not.toBeNull();
    req.flush({});
    httpControllerMock.verify();
  });

  it('verify with BatchSpanProcessorConfig', () => {
    ({ httpClient, httpControllerMock } = defineModuleTest(
      httpClient,
      httpControllerMock,
      otelcolExporterProductionAndBatchSpanProcessorConfig
    ));

    const url = 'http://url.test.com';
    httpClient.get(url).subscribe();
    const req = httpControllerMock.expectOne(url);
    expect(req.request.headers).not.toBeNull();
    expect(req.request.headers.get('traceparent')).not.toBeNull();
    req.flush({});
    httpControllerMock.verify();
  });

  it('verify with a NoopSpanExporterService', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        NoopSpanExporterModule,
        W3CTraceContextPropagatorModule,
      ],
      providers: [
        {
          provide: OTEL_CONFIG,
          useValue: otelcolExporterConfig,
        },
        {
          provide: HTTP_INTERCEPTORS,
          useClass: OpenTelemetryHttpInterceptor,
          multi: true,
        }
      ],
    });
    httpClient = TestBed.inject(HttpClient);
    httpControllerMock = TestBed.inject(HttpTestingController);

    const url = 'http://url.test.com';
    httpClient.get(url).subscribe();
    const req = httpControllerMock.expectOne(url);
    expect(req.request.headers).not.toBeNull();
    expect(req.request.headers.get('traceparent')).not.toBeNull();
    req.flush({});
    httpControllerMock.verify();
  });

  it('verify with CustomSpan', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        ConsoleSpanExporterModule,
        W3CTraceContextPropagatorModule,
      ],
      providers: [
        {
          provide: OTEL_CONFIG,
          useValue: otelcolExporterConfig,
        },
        {
          provide: HTTP_INTERCEPTORS,
          useClass: OpenTelemetryHttpInterceptor,
          multi: true,
        },
        {
          provide: OTEL_CUSTOM_SPAN,
          useClass: CustomSpanImpl,

        }
      ],
    });
    httpClient = TestBed.inject(HttpClient);
    httpControllerMock = TestBed.inject(HttpTestingController);

    const url = 'http://url.test.com';
    httpClient.get(url).subscribe();
    const req = httpControllerMock.expectOne(url);
    expect(req.request.headers).not.toBeNull();
    expect(req.request.headers.get('traceparent')).not.toBeNull();
    req.flush({});
    httpControllerMock.verify();
  });
});

const defineModuleTest = (
  httpClient: HttpClient,
  httpControllerMock: HttpTestingController,
  otelcolConfig: OpenTelemetryConfig
) => {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [
      HttpClientTestingModule,
      ConsoleSpanExporterModule,
      W3CTraceContextPropagatorModule,
    ],
    providers: [
      {
        provide: OTEL_CONFIG,
        useValue: otelcolConfig,
      },
      {
        provide: HTTP_INTERCEPTORS,
        useClass: OpenTelemetryHttpInterceptor,
        multi: true,
      },
    ],
  });
  httpClient = TestBed.inject(HttpClient);
  httpControllerMock = TestBed.inject(HttpTestingController);
  return { httpClient, httpControllerMock };
};

class CustomSpanImpl implements CustomSpan {
  add(span: Span, request: HttpRequest<unknown>, response: HttpResponse<unknown> | HttpErrorResponse): Span {
    span.setAttribute('mycustom.key', request.params + ';' + response.status);
    return span;
  }
}
