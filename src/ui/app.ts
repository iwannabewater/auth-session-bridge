import { exportCredentials } from '../core/export';
import { defaultLimits, mergeReports, parseCredentialText } from '../core/parse';
import {
  outputFormats,
  type ExportReport,
  type OutputFormat,
  type ParseReport,
} from '../core/types';
import { preferredLocale, translate, type Locale, type MessageKey } from '../i18n';

interface AppState {
  locale: Locale;
  format: OutputFormat;
  includeSyntheticIdToken: boolean;
  report: ParseReport;
  exported: ExportReport | undefined;
  convertedAt: Date;
  inputRevision: number;
}

const emptyReport: ParseReport = { credentials: [], issues: [] };

export function mountApp(root: HTMLElement): void {
  // This markup is authored UI only; credential values are rendered through value or textContent.
  root.innerHTML = template();
  const elements = collectElements(root);
  const state: AppState = {
    locale: preferredLocale(navigator.language),
    format: 'sub2api',
    includeSyntheticIdToken: false,
    report: emptyReport,
    exported: undefined,
    convertedAt: new Date(),
    inputRevision: 0,
  };

  wireActions(elements, state);
  setLocale(elements, state, state.locale);
  updateView(elements, state);
}

function wireActions(elements: Elements, state: AppState): void {
  elements.localeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const locale = button.dataset.locale === 'zh-CN' ? 'zh-CN' : 'en';
      setLocale(elements, state, locale);
      updateView(elements, state);
    });
  });
  elements.formatButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const format = button.dataset.format;
      if (outputFormats.includes(format as OutputFormat)) {
        state.format = format as OutputFormat;
        updateView(elements, state);
      }
    });
  });
  elements.input.addEventListener('input', () => {
    state.inputRevision += 1;
    state.convertedAt = new Date();
    state.report =
      elements.input.value.trim() === '' ? emptyReport : parseCredentialText(elements.input.value);
    updateView(elements, state);
  });
  elements.synthetic.addEventListener('change', () => {
    state.includeSyntheticIdToken = elements.synthetic.checked;
    updateView(elements, state);
  });
  elements.clear.addEventListener('click', () => {
    state.inputRevision += 1;
    elements.input.value = '';
    elements.fileInput.value = '';
    state.report = emptyReport;
    updateView(elements, state);
    elements.input.focus();
  });
  elements.example.addEventListener('click', () => {
    state.inputRevision += 1;
    state.convertedAt = new Date();
    elements.input.value = JSON.stringify(exampleSession(), null, 2);
    state.report = parseCredentialText(elements.input.value, 'safe-example.json');
    updateView(elements, state);
  });
  elements.pickFiles.addEventListener('click', () => elements.fileInput.click());
  elements.fileInput.addEventListener('change', () => {
    void readFiles(elements.fileInput.files, elements, state);
  });
  ['dragenter', 'dragover'].forEach((eventName) => {
    elements.drop.addEventListener(eventName, (event) => {
      event.preventDefault();
      elements.drop.dataset.active = 'true';
    });
  });
  ['dragleave', 'drop'].forEach((eventName) => {
    elements.drop.addEventListener(eventName, (event) => {
      event.preventDefault();
      elements.drop.dataset.active = 'false';
    });
  });
  elements.drop.addEventListener('drop', (event) => {
    void readFiles(event.dataTransfer?.files ?? null, elements, state);
  });
  elements.copy.addEventListener('click', () => {
    void copyOutput(elements, state);
  });
  elements.download.addEventListener('click', () => downloadOutput(elements, state));
}

async function readFiles(
  files: FileList | null,
  elements: Elements,
  state: AppState,
): Promise<void> {
  const revision = state.inputRevision + 1;
  state.inputRevision = revision;
  const accepted = Array.from(files ?? []).filter(
    (file) => file.name.toLowerCase().endsWith('.json') || file.type === 'application/json',
  );
  if (accepted.length === 0) {
    setStatus(elements.inputStatus, translate(state.locale, 'noJsonFiles'), 'error');
    return;
  }
  if (accepted.length > defaultLimits.maxCredentials) {
    rejectFileBatch(elements, state, 'MAX_FILES');
    return;
  }
  const totalBytes = accepted.reduce((total, file) => total + file.size, 0);
  if (totalBytes > defaultLimits.maxBytes) {
    rejectFileBatch(elements, state, 'INPUT_TOO_LARGE');
    return;
  }
  setStatus(
    elements.inputStatus,
    translate(state.locale, 'readingFiles', { count: accepted.length }),
    'neutral',
  );
  const texts = await Promise.all(accepted.map(async (file) => file.text()));
  if (revision !== state.inputRevision) {
    return;
  }
  state.convertedAt = new Date();
  const reports = texts.map((text, index) =>
    parseCredentialText(text, accepted[index]?.name ?? 'dropped-file.json'),
  );
  const textValues = texts.flatMap((text) => {
    try {
      return [JSON.parse(text) as unknown];
    } catch {
      return [];
    }
  });
  elements.input.value =
    textValues.length > 0
      ? JSON.stringify(textValues.length === 1 ? textValues[0] : textValues, null, 2)
      : texts.join('\n');
  state.report = mergeReports(reports);
  updateView(elements, state);
}

function rejectFileBatch(
  elements: Elements,
  state: AppState,
  code: 'INPUT_TOO_LARGE' | 'MAX_FILES',
): void {
  elements.input.value = '';
  state.convertedAt = new Date();
  state.report = {
    credentials: [],
    issues: [{ severity: 'error', code, sourceName: 'selected-files', path: '$' }],
  };
  updateView(elements, state);
}

async function copyOutput(elements: Elements, state: AppState): Promise<void> {
  if (!state.exported) {
    return;
  }
  try {
    await navigator.clipboard.writeText(elements.output.value);
    setStatus(elements.outputStatus, translate(state.locale, 'copied'), 'success');
  } catch {
    elements.output.select();
    const copied = document.execCommand('copy');
    setStatus(
      elements.outputStatus,
      translate(state.locale, copied ? 'copied' : 'copyFailed'),
      copied ? 'success' : 'error',
    );
  }
}

function downloadOutput(elements: Elements, state: AppState): void {
  if (!state.exported) {
    return;
  }
  const blob = new Blob([elements.output.value], { type: 'application/json' });
  const anchor = document.createElement('a');
  const url = URL.createObjectURL(blob);
  anchor.href = url;
  anchor.download = state.exported.filename;
  anchor.click();
  URL.revokeObjectURL(url);
  setStatus(elements.outputStatus, translate(state.locale, 'downloaded'), 'success');
}

function setLocale(elements: Elements, state: AppState, locale: Locale): void {
  state.locale = locale;
  document.documentElement.lang = locale;
  document.documentElement.dataset.locale = locale;
  if (locale === 'zh-CN') {
    void import('lxgw-wenkai-screen-webfont/lxgwwenkaigbscreen.css');
  }
  elements.translated.forEach((element) => {
    const key = element.dataset.i18n as MessageKey | undefined;
    if (key) {
      element.textContent = translate(locale, key);
    }
  });
  elements.translatedLabels.forEach((element) => {
    const key = element.dataset.i18nLabel as MessageKey | undefined;
    if (key) {
      element.setAttribute('aria-label', translate(locale, key));
    }
  });
  const globalSkipLink = document.querySelector<HTMLElement>('[data-global-i18n="skip"]');
  if (globalSkipLink) {
    globalSkipLink.textContent = translate(locale, 'skip');
  }
  elements.input.placeholder = translate(locale, 'inputPlaceholder');
  elements.localeButtons.forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.locale === locale));
  });
  document.title = `${translate(locale, 'title')} | ${translate(locale, 'subtitle')}`;
}

function updateView(elements: Elements, state: AppState): void {
  elements.formatButtons.forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.format === state.format));
  });
  if (state.report.credentials.length > 0) {
    state.exported = exportCredentials(state.format, state.report.credentials, {
      includeSyntheticIdToken: state.includeSyntheticIdToken,
      now: state.convertedAt,
    });
    elements.output.value = JSON.stringify(state.exported.document, null, 2);
    elements.copy.disabled = false;
    elements.download.disabled = false;
    setStatus(
      elements.inputStatus,
      translate(state.locale, 'ready', { count: state.report.credentials.length }),
      'success',
    );
    setStatus(elements.outputStatus, state.exported.filename, 'neutral');
  } else {
    state.exported = undefined;
    elements.output.value = '';
    elements.copy.disabled = true;
    elements.download.disabled = true;
    const firstError = state.report.issues.find((issue) => issue.severity === 'error');
    setStatus(
      elements.inputStatus,
      firstError
        ? translate(state.locale, `issue_${firstError.code}`)
        : translate(state.locale, 'waiting'),
      firstError ? 'error' : 'neutral',
    );
    setStatus(elements.outputStatus, translate(state.locale, 'noOutput'), 'neutral');
  }
  renderAccounts(elements, state);
  renderIssues(elements, state);
}

function renderAccounts(elements: Elements, state: AppState): void {
  elements.accounts.replaceChildren();
  if (state.report.credentials.length === 0) {
    elements.accounts.append(createEmpty(translate(state.locale, 'empty')));
    return;
  }
  state.report.credentials.forEach((credential) => {
    const item = document.createElement('li');
    item.className = 'account';
    const identity = document.createElement('strong');
    identity.textContent = credential.email ?? credential.accountId ?? credential.sourceName;
    const meta = document.createElement('span');
    const refresh = translate(
      state.locale,
      credential.refreshToken ? 'refreshReady' : 'accessOnly',
    );
    meta.textContent = `${credential.sourceKind} / ${refresh}`;
    const expiry = document.createElement('span');
    expiry.textContent = credential.expiresAt
      ? `${translate(state.locale, 'expiry')}: ${new Date(credential.expiresAt).toLocaleString(state.locale)}`
      : `${translate(state.locale, 'source')}: ${credential.sourceName}`;
    item.append(identity, meta, expiry);
    elements.accounts.append(item);
  });
}

function renderIssues(elements: Elements, state: AppState): void {
  elements.issues.replaceChildren();
  const warnings = state.exported?.warnings ?? [];
  const entries = [
    ...state.report.issues.map((issue) => ({
      tone: issue.severity,
      message: translate(state.locale, `issue_${issue.code}`),
      suffix: issue.detail ? ` ${issue.detail}` : '',
    })),
    ...warnings.map((warning) => ({
      tone: 'warning',
      message: translate(state.locale, `warning_${warning.code}`),
      suffix: '',
    })),
  ];
  if (entries.length === 0) {
    elements.issues.append(createEmpty(translate(state.locale, 'empty')));
    return;
  }
  entries.forEach(({ tone, message, suffix }) => {
    const item = document.createElement('li');
    item.className = `issue issue-${tone}`;
    item.textContent = `${message}${suffix}`;
    elements.issues.append(item);
  });
}

function createEmpty(text: string): HTMLLIElement {
  const item = document.createElement('li');
  item.className = 'empty';
  item.textContent = text;
  return item;
}

function setStatus(
  element: HTMLElement,
  message: string,
  tone: 'neutral' | 'success' | 'error',
): void {
  element.textContent = message;
  element.dataset.tone = tone;
}

function exampleSession(): unknown {
  const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' })).replaceAll('=', '');
  const payload = btoa(
    JSON.stringify({
      email: 'demo@local.invalid',
      exp: 1893456000,
      'https://api.openai.com/auth': {
        chatgpt_account_id: 'acct_local_example',
        chatgpt_plan_type: 'plus',
      },
    }),
  ).replaceAll('=', '');
  return {
    user: { email: 'demo@local.invalid' },
    account: { id: 'acct_local_example', planType: 'plus' },
    accessToken: `${header}.${payload}.example`,
  };
}

interface Elements {
  input: HTMLTextAreaElement;
  output: HTMLTextAreaElement;
  fileInput: HTMLInputElement;
  synthetic: HTMLInputElement;
  drop: HTMLElement;
  pickFiles: HTMLButtonElement;
  example: HTMLButtonElement;
  clear: HTMLButtonElement;
  copy: HTMLButtonElement;
  download: HTMLButtonElement;
  inputStatus: HTMLElement;
  outputStatus: HTMLElement;
  accounts: HTMLUListElement;
  issues: HTMLUListElement;
  translated: NodeListOf<HTMLElement>;
  translatedLabels: NodeListOf<HTMLElement>;
  localeButtons: NodeListOf<HTMLButtonElement>;
  formatButtons: NodeListOf<HTMLButtonElement>;
}

function collectElements(root: HTMLElement): Elements {
  return {
    input: required(root, '#session-input'),
    output: required(root, '#output'),
    fileInput: required(root, '#file-input'),
    synthetic: required(root, '#synthetic'),
    drop: required(root, '#drop-zone'),
    pickFiles: required(root, '#pick-files'),
    example: required(root, '#load-example'),
    clear: required(root, '#clear-input'),
    copy: required(root, '#copy-output'),
    download: required(root, '#download-output'),
    inputStatus: required(root, '#input-status'),
    outputStatus: required(root, '#output-status'),
    accounts: required(root, '#accounts'),
    issues: required(root, '#issues'),
    translated: root.querySelectorAll('[data-i18n]'),
    translatedLabels: root.querySelectorAll('[data-i18n-label]'),
    localeButtons: root.querySelectorAll('[data-locale]'),
    formatButtons: root.querySelectorAll('[data-format]'),
  };
}

function required<ElementType extends Element>(root: HTMLElement, selector: string): ElementType {
  const element = root.querySelector<ElementType>(selector);
  if (!element) {
    throw new Error(`Missing application element: ${selector}`);
  }
  return element;
}

function template(): string {
  return `
    <header class="masthead">
      <div class="identity">
        <div class="mark" aria-hidden="true">SB</div>
        <div>
          <div class="wordmark" data-i18n="title"></div>
          <p class="subtitle" data-i18n="subtitle"></p>
        </div>
      </div>
      <nav class="locale-switch" aria-label="Language" data-i18n-label="localeLabel">
        <button type="button" data-locale="en" aria-pressed="false" data-i18n="english"></button>
        <button type="button" data-locale="zh-CN" aria-pressed="false" data-i18n="chinese"></button>
      </nav>
    </header>
    <aside class="safety-rail" aria-label="Credential safety" data-i18n-label="safetyLabel">
      <span class="pulse" aria-hidden="true"></span>
      <strong data-i18n="safetyLocal"></strong>
      <span data-i18n="safetyNetwork"></span>
      <span data-i18n="safetyClipboard"></span>
    </aside>
    <main class="workspace" id="workspace">
      <section class="introduction" aria-labelledby="page-title">
        <h1 id="page-title" data-i18n="heading"></h1>
        <p data-i18n="lead"></p>
      </section>
      <section class="format-bar" aria-labelledby="format-label">
        <span id="format-label" data-i18n="formatLabel"></span>
        <div class="format-tabs" role="group" aria-labelledby="format-label">
          <button type="button" data-format="sub2api" aria-pressed="true">sub2api</button>
          <button type="button" data-format="cpa" aria-pressed="false">CPA</button>
          <button type="button" data-format="cockpit" aria-pressed="false">Cockpit</button>
          <button type="button" data-format="9router" aria-pressed="false">9router</button>
          <button type="button" data-format="axonhub" aria-pressed="false">AxonHub</button>
          <button type="button" data-format="codex-manager" aria-pressed="false">Codex-Manager</button>
        </div>
      </section>
      <div class="conversion-grid">
        <section class="editor input-panel" aria-labelledby="input-title">
          <header>
            <h2 id="input-title" data-i18n="inputTitle"></h2>
            <p data-i18n="inputHelp"></p>
          </header>
          <textarea id="session-input" spellcheck="false" autocomplete="off"></textarea>
          <input id="file-input" class="visually-hidden" type="file" multiple accept=".json,application/json" />
          <div class="toolbar">
            <button class="action" id="pick-files" type="button" data-i18n="selectFiles"></button>
            <button class="action" id="load-example" type="button" data-i18n="example"></button>
            <button class="quiet" id="clear-input" type="button" data-i18n="clear"></button>
          </div>
          <div class="drop-zone" id="drop-zone">
            <strong data-i18n="drop"></strong>
            <span data-i18n="dropHint"></span>
          </div>
          <p class="status" id="input-status" role="status"></p>
        </section>
        <section class="editor output-panel" aria-labelledby="output-title">
          <header>
            <h2 id="output-title" data-i18n="outputTitle"></h2>
            <p data-i18n="outputHelp"></p>
          </header>
          <textarea id="output" readonly spellcheck="false"></textarea>
          <label class="synthetic-toggle">
            <input id="synthetic" type="checkbox" />
            <span data-i18n="synthetic"></span>
          </label>
          <p class="synthetic-note" data-i18n="syntheticWarning"></p>
          <div class="toolbar">
            <button class="primary" id="copy-output" type="button" disabled data-i18n="copy"></button>
            <button class="action" id="download-output" type="button" disabled data-i18n="download"></button>
          </div>
          <p class="status" id="output-status" role="status"></p>
        </section>
      </div>
      <section class="ledger" aria-label="Conversion details" data-i18n-label="detailsLabel">
        <article>
          <h2 data-i18n="accounts"></h2>
          <ul id="accounts"></ul>
        </article>
        <article>
          <h2 data-i18n="issues"></h2>
          <ul id="issues"></ul>
        </article>
      </section>
      <section class="notes">
        <p data-i18n="securityNote"></p>
        <p data-i18n="compatibilityNote"></p>
      </section>
    </main>
    <footer class="footer" data-i18n="footer"></footer>
  `;
}
