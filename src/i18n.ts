export type Locale = 'en' | 'zh-CN';

const english = {
  title: 'Session Bridge',
  subtitle: 'Credential format conversion, performed locally',
  localeLabel: 'Language',
  safetyLabel: 'Credential safety',
  detailsLabel: 'Conversion details',
  skip: 'Skip to workspace',
  english: 'English',
  chinese: '中文',
  safetyLocal: 'Local processing',
  safetyNetwork: 'No uploads or telemetry',
  safetyClipboard: 'Copied JSON contains credentials',
  heading: 'Convert an authenticated session without sending it anywhere',
  lead: 'Paste or drop session JSON. The browser produces import documents for Codex-compatible tools.',
  formatLabel: 'Output format',
  inputTitle: 'Input',
  inputHelp: 'ChatGPT session, portable auth JSON, or a supported export bundle',
  inputPlaceholder: 'Paste JSON containing accessToken or tokens.access_token',
  selectFiles: 'Select JSON files',
  example: 'Load safe example',
  clear: 'Clear',
  drop: 'Drop JSON files here',
  dropHint: 'Multiple files supported, up to 4 MiB combined and 250 files',
  outputTitle: 'Output',
  outputHelp: 'Review warnings before copying credentials to another tool',
  synthetic:
    'Generate an explicit synthetic ID token when a target benefits from claims compatibility',
  syntheticWarning:
    'Synthetic ID tokens are not authenticated tokens and may be rejected by downstream tools.',
  copy: 'Copy JSON',
  download: 'Download JSON',
  accounts: 'Detected accounts',
  issues: 'Checks',
  waiting: 'Waiting for JSON input.',
  ready: '{count} credential record(s) prepared.',
  noOutput: 'No export produced.',
  copied: 'JSON copied. Treat your clipboard as sensitive.',
  copyFailed: 'Clipboard access failed. Select and copy the output manually.',
  downloaded: 'JSON file downloaded.',
  readingFiles: 'Reading {count} file(s).',
  noJsonFiles: 'Select or drop JSON files only.',
  source: 'Source',
  expiry: 'Expires',
  accessOnly: 'Access token only',
  refreshReady: 'Refresh token included',
  empty: 'No credentials detected yet.',
  securityNote:
    'A session token or access token can grant account access. This application does not store, upload, or log input.',
  compatibilityNote:
    'Exports target currently verified import structures. Access-only sessions cannot renew themselves after expiry.',
  footer: 'Built as a static, local-only converter. No account data is persisted.',
  issue_EMPTY_INPUT: 'Enter JSON before converting.',
  issue_INVALID_JSON: 'JSON could not be parsed.',
  issue_INPUT_TOO_LARGE: 'Input exceeds the 4 MiB processing limit.',
  issue_MAX_FILES: 'Select no more than 250 JSON files at a time.',
  issue_MAX_DEPTH: 'Input nesting exceeds the safe processing depth.',
  issue_MAX_NODES: 'Input contains too many nested values to process safely.',
  issue_MAX_CREDENTIALS: 'Input exceeds the 250 account processing limit.',
  issue_NO_CREDENTIAL: 'No object containing an access token was detected.',
  issue_TOKEN_METADATA_UNAVAILABLE:
    'Token accepted, but no readable account metadata or expiry was found.',
  issue_ACCESS_ONLY:
    'No refresh token present. This account stops working when its access token expires.',
  issue_SYNTHETIC_INPUT_TOKEN:
    'Input contains a synthetic ID token. It is metadata only, not proof of authentication.',
  warning_NO_REFRESH_TOKEN: 'At least one output account has no refresh token.',
  warning_NO_ACCOUNT_ID: 'At least one account has no detected account ID.',
  warning_SYNTHETIC_ID_TOKEN: 'Output includes an explicitly requested synthetic ID token.',
  warning_MULTI_DOCUMENT_OUTPUT:
    'Multiple accounts are emitted as an array; import individually if the target expects one file.',
  warning_ACCESS_TOKEN_IMPORT_ONLY:
    '9router output uses its verified access-token import structure and omits refresh metadata.',
} as const;

const chinese: Record<keyof typeof english, string> = {
  title: 'Session Bridge',
  subtitle: '仅在本地完成的凭证格式转换',
  localeLabel: '语言',
  safetyLabel: '凭证安全',
  detailsLabel: '转换详情',
  skip: '跳到转换工作区',
  english: 'English',
  chinese: '中文',
  safetyLocal: '本地处理',
  safetyNetwork: '不上传，不遥测',
  safetyClipboard: '复制内容包含敏感凭证',
  heading: '在不发送凭证的前提下转换登录 Session',
  lead: '粘贴或拖入 Session JSON，浏览器将生成可供 Codex 兼容工具导入的文档。',
  formatLabel: '输出格式',
  inputTitle: '输入',
  inputHelp: 'ChatGPT Session、便携 auth JSON 或受支持的导出包',
  inputPlaceholder: '粘贴含有 accessToken 或 tokens.access_token 的 JSON',
  selectFiles: '选择 JSON 文件',
  example: '载入安全示例',
  clear: '清空',
  drop: '将 JSON 文件拖到此处',
  dropHint: '支持多个文件，总计不超过 4 MiB 且不超过 250 个文件',
  outputTitle: '输出',
  outputHelp: '将凭证复制到目标工具前，请先查看警告',
  synthetic: '当目标依赖 claims 兼容性时，显式生成合成 ID token',
  syntheticWarning: '合成 ID token 不是已认证 token，下游工具可能拒绝它。',
  copy: '复制 JSON',
  download: '下载 JSON',
  accounts: '识别到的账号',
  issues: '检查结果',
  waiting: '等待 JSON 输入。',
  ready: '已准备 {count} 条凭证记录。',
  noOutput: '尚未生成导出内容。',
  copied: 'JSON 已复制，请将剪贴板视为敏感内容。',
  copyFailed: '无法访问剪贴板，请手动选中并复制输出。',
  downloaded: 'JSON 文件已下载。',
  readingFiles: '正在读取 {count} 个文件。',
  noJsonFiles: '请选择或拖入 JSON 文件。',
  source: '来源',
  expiry: '过期时间',
  accessOnly: '仅 access token',
  refreshReady: '含 refresh token',
  empty: '尚未识别到凭证。',
  securityNote:
    'Session token 或 access token 可以授予账号访问能力。本应用不保存、不上传、不记录输入。',
  compatibilityNote:
    '输出遵循目前已核验的导入结构。仅含 access token 的 Session 过期后无法自行续期。',
  footer: '静态、本地运行的转换工具，不持久化任何账号数据。',
  issue_EMPTY_INPUT: '请输入 JSON 后再进行转换。',
  issue_INVALID_JSON: '无法解析 JSON。',
  issue_INPUT_TOO_LARGE: '输入超过 4 MiB 的处理上限。',
  issue_MAX_FILES: '一次最多选择 250 个 JSON 文件。',
  issue_MAX_DEPTH: '输入嵌套深度超过安全处理上限。',
  issue_MAX_NODES: '输入含有过多嵌套数据，已停止安全处理。',
  issue_MAX_CREDENTIALS: '输入超过 250 个账号的处理上限。',
  issue_NO_CREDENTIAL: '未发现含有 access token 的对象。',
  issue_TOKEN_METADATA_UNAVAILABLE: '已接受 token，但未找到可读取的账号信息或过期时间。',
  issue_ACCESS_ONLY: '未包含 refresh token，access token 过期后该账号将不可继续使用。',
  issue_SYNTHETIC_INPUT_TOKEN: '输入含有合成 ID token，它仅承载元数据，不能证明认证状态。',
  warning_NO_REFRESH_TOKEN: '至少一个输出账号不含 refresh token。',
  warning_NO_ACCOUNT_ID: '至少一个账号未识别到账户 ID。',
  warning_SYNTHETIC_ID_TOKEN: '输出包含你显式要求生成的合成 ID token。',
  warning_MULTI_DOCUMENT_OUTPUT: '多个账号将输出为数组；若目标仅接受单文件，请逐个导入。',
  warning_ACCESS_TOKEN_IMPORT_ONLY:
    '9router 输出采用已核验的 access-token 导入结构，不携带刷新元数据。',
};

const catalog: Record<Locale, Record<keyof typeof english, string>> = {
  en: english,
  'zh-CN': chinese,
};

export type MessageKey = keyof typeof english;

export function translate(
  locale: Locale,
  key: MessageKey,
  variables?: Record<string, string | number>,
): string {
  let message = catalog[locale][key];
  Object.entries(variables ?? {}).forEach(([name, value]) => {
    message = message.replaceAll(`{${name}}`, String(value));
  });
  return message;
}

export function preferredLocale(language: string): Locale {
  return language.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en';
}
