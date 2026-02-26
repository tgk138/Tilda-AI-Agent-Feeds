const SK_TEXT_PROVIDER = 'tilda_flows_text_provider';
const SK_TEXT_API_KEY = 'tilda_flows_text_api_key';
const SK_TEXT_MODEL = 'tilda_flows_text_model';
const SK_MEDIA_PROVIDER = 'tilda_flows_media_provider';
const SK_MEDIA_API_KEY = 'tilda_flows_media_api_key';
const SK_MEDIA_MODEL = 'tilda_flows_media_model';
const SK_AUTHOR_NAME = 'tilda_flows_author_name';
const SK_AUTHOR_LINK = 'tilda_flows_author_link';
const SK_BRAND_KNOWLEDGE = 'tilda_flows_brand_knowledge';
const SK_TONE_OF_VOICE = 'tilda_flows_tone_of_voice';
const SK_CUSTOM_FOOTER = 'tilda_flows_custom_footer';
const SK_HISTORY = 'tilda_flows_history';

// Legacy keys for migration
const SK_LEGACY_KEY = 'tilda_flows_api_key';
const SK_LEGACY_PROVIDER = 'tilda_flows_api_provider';
const SK_LEGACY_OFFICIAL_KEY = 'tilda_flows_official_gemini_api_key';

const PROVIDER_HINTS = {
  kie: 'Один ключ для Gemini 3 Pro. <a href="https://kie.ai" target="_blank">Получить на kie.ai</a>',
  google: 'Официальный ключ Google AI Studio. <a href="https://aistudio.google.com/" target="_blank">Получить</a> (В РФ нужен VPN)',
  openrouter: 'Единый ключ к 500+ моделям. <a href="https://openrouter.ai/keys" target="_blank">Получить на OpenRouter</a>',
  openai: 'Ключ OpenAI API. <a href="https://platform.openai.com/api-keys" target="_blank">Получить</a>',
  anthropic: 'Ключ Anthropic API. <a href="https://console.anthropic.com/" target="_blank">Получить</a>',
  'kie-banana': 'Тот же ключ kie.ai. <a href="https://kie.ai" target="_blank">Получить</a>',
  'kie-gpt-image': 'Тот же ключ kie.ai, модели GPT Image. <a href="https://kie.ai" target="_blank">Получить</a>',
  'google-imagen': 'Официальный ключ Google AI Studio. <a href="https://aistudio.google.com/" target="_blank">Получить</a>',
  'gpt-image': 'Ключ OpenAI API. <a href="https://platform.openai.com/api-keys" target="_blank">Получить</a>',
};

const INLINE_LOGO_DATA_URL = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">' +
    '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#16a34a"/><stop offset="1" stop-color="#22c55e"/>' +
    '</linearGradient></defs>' +
    '<rect x="4" y="4" width="56" height="56" rx="14" fill="url(#g)"/>' +
    '<path d="M20 20h24v6h-9v18h-6V26h-9z" fill="#fff"/>' +
    '<circle cx="47" cy="47" r="6" fill="#fff" fill-opacity="0.92"/>' +
  '</svg>'
);

let providerData = { text: [], media: [] };

// ── Init ──────────────────────────────────────────────────────────────────────

async function tryLoadCustomLogo() {
  try {
    const url = chrome.runtime.getURL('tilda-kovcheg.png');
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch (_) {
    return null;
  }
}

function init() {
  // Logo
  const logoEl = document.getElementById('headerLogo');
  if (logoEl) {
    logoEl.src = INLINE_LOGO_DATA_URL;
    tryLoadCustomLogo().then((src) => { if (src) logoEl.src = src; });
  }

  // Open in tab
  const openInTab = document.getElementById('openInTab');
  if (openInTab) {
    openInTab.addEventListener('click', (e) => {
      e.preventDefault();
      window.open(chrome.runtime.getURL('popup/popup.html'), '_blank', 'noopener');
    });
  }

  // Check if on Tilda
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs.length > 0) {
      const url = tabs[0].url || '';
      if (!url.includes('tilda.cc') && !url.includes('tilda.ru')) {
        document.getElementById('ctaBanner').classList.add('show');
      }
    }
  });

  // Tabs
  const tabEls = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');
  tabEls.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabEls.forEach((t) => t.classList.remove('active'));
      tabContents.forEach((c) => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.getAttribute('data-tab')).classList.add('active');
      if (tab.getAttribute('data-tab') === 'tab-history') loadHistory();
    });
  });

  // Buttons
  document.getElementById('saveText').addEventListener('click', saveTextProvider);
  document.getElementById('checkText').addEventListener('click', checkTextKey);
  document.getElementById('saveMedia').addEventListener('click', saveMediaProvider);
  document.getElementById('checkMedia').addEventListener('click', checkMediaKey);
  document.getElementById('saveAuthor').addEventListener('click', (e) => { e.preventDefault(); saveAuthor(); });
  document.getElementById('saveContentSettings').addEventListener('click', saveContentSettings);

  // Provider change handlers
  document.getElementById('textProvider').addEventListener('change', onTextProviderChange);
  document.getElementById('mediaProvider').addEventListener('change', onMediaProviderChange);

  // Load providers from background, then load saved settings
  chrome.runtime.sendMessage({ action: 'listProviders' }, (resp) => {
    if (resp) {
      providerData = resp;
    }
    populateProviderSelects();
    loadSaved();
  });
}

// ── Provider Selects ──────────────────────────────────────────────────────────

function populateProviderSelects() {
  const textSelect = document.getElementById('textProvider');
  const mediaSelect = document.getElementById('mediaProvider');

  textSelect.innerHTML = '';
  for (const p of providerData.text) {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name;
    textSelect.appendChild(opt);
  }

  mediaSelect.innerHTML = '';
  for (const p of providerData.media) {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name;
    mediaSelect.appendChild(opt);
  }
}

function populateModelSelect(selectId, providerId, providerList) {
  const select = document.getElementById(selectId);
  select.innerHTML = '';
  const provider = providerList.find((p) => p.id === providerId);
  if (!provider) return;
  for (const m of provider.models) {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = m.name;
    select.appendChild(opt);
  }
}

function onTextProviderChange() {
  const providerId = document.getElementById('textProvider').value;
  populateModelSelect('textModel', providerId, providerData.text);
  const hint = document.getElementById('textProviderHint');
  if (hint) hint.innerHTML = PROVIDER_HINTS[providerId] || '';
  clearStatus('textStatus');
}

function onMediaProviderChange() {
  const providerId = document.getElementById('mediaProvider').value;
  populateModelSelect('mediaModel', providerId, providerData.media);
  const hint = document.getElementById('mediaProviderHint');
  if (hint) hint.innerHTML = PROVIDER_HINTS[providerId] || '';
  clearStatus('mediaStatus');
}

// ── Load Saved ────────────────────────────────────────────────────────────────

function loadSaved() {
  chrome.storage.local.get([
    SK_TEXT_PROVIDER, SK_TEXT_API_KEY, SK_TEXT_MODEL,
    SK_MEDIA_PROVIDER, SK_MEDIA_API_KEY, SK_MEDIA_MODEL,
    SK_LEGACY_PROVIDER, SK_LEGACY_KEY, SK_LEGACY_OFFICIAL_KEY,
    SK_AUTHOR_NAME, SK_AUTHOR_LINK,
    SK_BRAND_KNOWLEDGE, SK_TONE_OF_VOICE, SK_CUSTOM_FOOTER,
  ], (r) => {
    // Text provider (with legacy migration)
    let textProvider = r[SK_TEXT_PROVIDER];
    let textApiKey = r[SK_TEXT_API_KEY];
    let textModel = r[SK_TEXT_MODEL];

    if (!textProvider && r[SK_LEGACY_PROVIDER]) {
      textProvider = r[SK_LEGACY_PROVIDER] === 'official' ? 'google' : 'kie';
      textApiKey = r[SK_LEGACY_PROVIDER] === 'official' ? r[SK_LEGACY_OFFICIAL_KEY] : r[SK_LEGACY_KEY];
    }

    if (textProvider) {
      document.getElementById('textProvider').value = textProvider;
      onTextProviderChange();
    } else {
      onTextProviderChange();
    }
    if (textApiKey) document.getElementById('textApiKey').value = textApiKey;
    if (textModel) {
      const modelSelect = document.getElementById('textModel');
      if (modelSelect.querySelector(`option[value="${textModel}"]`)) {
        modelSelect.value = textModel;
      }
    }

    // Media provider (with legacy migration)
    let mediaProvider = r[SK_MEDIA_PROVIDER];
    let mediaApiKey = r[SK_MEDIA_API_KEY];
    let mediaModel = r[SK_MEDIA_MODEL];

    if (!mediaProvider && r[SK_LEGACY_PROVIDER]) {
      if (r[SK_LEGACY_PROVIDER] === 'official') {
        mediaProvider = 'google-imagen';
        mediaApiKey = r[SK_LEGACY_OFFICIAL_KEY];
      } else {
        mediaProvider = 'kie-banana';
        mediaApiKey = r[SK_LEGACY_KEY];
      }
    }

    if (mediaProvider) {
      document.getElementById('mediaProvider').value = mediaProvider;
      onMediaProviderChange();
    } else {
      onMediaProviderChange();
    }
    if (mediaApiKey) document.getElementById('mediaApiKey').value = mediaApiKey;
    if (mediaModel) {
      const modelSelect = document.getElementById('mediaModel');
      if (modelSelect.querySelector(`option[value="${mediaModel}"]`)) {
        modelSelect.value = mediaModel;
      }
    }

    // Author
    if (r[SK_AUTHOR_NAME]) document.getElementById('authorName').value = r[SK_AUTHOR_NAME];
    if (r[SK_AUTHOR_LINK]) document.getElementById('authorLink').value = r[SK_AUTHOR_LINK];

    // Content settings
    if (r[SK_BRAND_KNOWLEDGE]) document.getElementById('brandKnowledge').value = r[SK_BRAND_KNOWLEDGE];
    if (r[SK_TONE_OF_VOICE]) document.getElementById('toneOfVoice').value = r[SK_TONE_OF_VOICE];
    if (r[SK_CUSTOM_FOOTER]) document.getElementById('customFooter').value = r[SK_CUSTOM_FOOTER];
  });
}

// ── Save / Check ──────────────────────────────────────────────────────────────

function saveTextProvider() {
  const provider = document.getElementById('textProvider').value;
  const key = document.getElementById('textApiKey').value.trim();
  const model = document.getElementById('textModel').value;

  chrome.storage.local.set({
    [SK_TEXT_PROVIDER]: provider,
    [SK_TEXT_API_KEY]: key,
    [SK_TEXT_MODEL]: model,
  }, () => {
    showStatus('textStatus', 'Текстовый провайдер сохранён ✓', 'success');
  });
}

function saveMediaProvider() {
  const provider = document.getElementById('mediaProvider').value;
  const key = document.getElementById('mediaApiKey').value.trim();
  const model = document.getElementById('mediaModel').value;

  chrome.storage.local.set({
    [SK_MEDIA_PROVIDER]: provider,
    [SK_MEDIA_API_KEY]: key,
    [SK_MEDIA_MODEL]: model,
  }, () => {
    showStatus('mediaStatus', 'Провайдер изображений сохранён ✓', 'success');
  });
}

function checkTextKey() {
  const providerId = document.getElementById('textProvider').value;
  const apiKey = document.getElementById('textApiKey').value.trim();
  const model = document.getElementById('textModel').value;

  if (!apiKey) {
    showStatus('textStatus', 'Введите API Key и сохраните.', 'error');
    return;
  }

  const btn = document.getElementById('checkText');
  btn.disabled = true;
  showStatus('textStatus', 'Проверка...', 'success');

  chrome.runtime.sendMessage(
    { action: 'checkTextKey', providerId, apiKey, model },
    (result) => {
      btn.disabled = false;
      if (result && result.valid) {
        showStatus('textStatus', 'Ключ действителен ✓', 'success');
      } else {
        showStatus('textStatus', 'Ошибка: ' + ((result && result.error) || 'неизвестная'), 'error');
      }
    }
  );
}

function checkMediaKey() {
  const providerId = document.getElementById('mediaProvider').value;
  const apiKey = document.getElementById('mediaApiKey').value.trim();

  if (!apiKey) {
    showStatus('mediaStatus', 'Введите API Key и сохраните.', 'error');
    return;
  }

  const btn = document.getElementById('checkMedia');
  btn.disabled = true;
  showStatus('mediaStatus', 'Проверка...', 'success');

  chrome.runtime.sendMessage(
    { action: 'checkMediaKey', providerId, apiKey },
    (result) => {
      btn.disabled = false;
      if (result && result.valid) {
        showStatus('mediaStatus', 'Ключ действителен ✓', 'success');
      } else {
        showStatus('mediaStatus', 'Ошибка: ' + ((result && result.error) || 'неизвестная'), 'error');
      }
    }
  );
}

// ── Author ────────────────────────────────────────────────────────────────────

function showAuthorToast(message) {
  const existing = document.getElementById('tilda-kovcheg-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.id = 'tilda-kovcheg-toast';
  toast.setAttribute('role', 'alert');
  toast.style.cssText = 'display:block !important; visibility:visible !important; position:fixed !important; top:0 !important; left:0 !important; right:0 !important; z-index:99999 !important; background:#198754 !important; color:#fff !important; padding:12px 16px !important; font-size:14px !important; font-weight:600 !important; text-align:center !important; box-shadow:0 4px 12px rgba(0,0,0,0.2) !important;';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    const t = document.getElementById('tilda-kovcheg-toast');
    if (t) t.remove();
  }, 5000);
}

function saveAuthor() {
  const name = document.getElementById('authorName').value.trim();
  const link = document.getElementById('authorLink').value.trim();
  const btn = document.getElementById('saveAuthor');
  const statusEl = document.getElementById('authorStatus');
  if (!btn) return;
  if (statusEl) { statusEl.textContent = ''; statusEl.className = 'status status-author'; }
  btn.disabled = true;
  btn.classList.remove('saved');
  btn.textContent = 'Сохранение…';
  chrome.storage.local.set({
    [SK_AUTHOR_NAME]: name,
    [SK_AUTHOR_LINK]: link,
  }, () => {
    btn.disabled = false;
    btn.textContent = 'Сохранено ✓';
    btn.classList.add('saved');
    const msg = (name || link) ? 'Автор сохранён. Подставится при «Заполнить всё» на странице поста.' : 'Поля автора очищены.';
    showAuthorToast(msg);
    if (statusEl) {
      statusEl.textContent = msg;
      statusEl.className = 'status status-author show success';
    }
    setTimeout(() => {
      btn.textContent = 'Сохранить автора';
      btn.classList.remove('saved');
      if (statusEl) statusEl.classList.remove('show');
    }, 4000);
  });
}

// ── Content Settings ──────────────────────────────────────────────────────────

function saveContentSettings() {
  const brandKnowledge = document.getElementById('brandKnowledge').value.trim();
  const toneOfVoice = document.getElementById('toneOfVoice').value;
  const customFooter = document.getElementById('customFooter').value.trim();

  const btn = document.getElementById('saveContentSettings');
  const statusEl = document.getElementById('contentStatus');
  if (!btn) return;
  if (statusEl) { statusEl.textContent = ''; statusEl.className = 'status status-author'; }
  btn.disabled = true;
  btn.classList.remove('saved');
  btn.textContent = 'Сохранение…';

  chrome.storage.local.set({
    [SK_BRAND_KNOWLEDGE]: brandKnowledge,
    [SK_TONE_OF_VOICE]: toneOfVoice,
    [SK_CUSTOM_FOOTER]: customFooter,
  }, () => {
    btn.disabled = false;
    btn.textContent = 'Сохранено ✓';
    btn.classList.add('saved');
    if (statusEl) {
      statusEl.textContent = 'Настройки контента сохранены.';
      statusEl.className = 'status status-author show success';
    }
    setTimeout(() => {
      btn.textContent = 'Сохранить настройки';
      btn.classList.remove('saved');
      if (statusEl) statusEl.classList.remove('show');
    }, 4000);
  });
}

// ── History ───────────────────────────────────────────────────────────────────

function loadHistory() {
  const container = document.getElementById('tab-history');
  chrome.storage.local.get([SK_HISTORY], (data) => {
    const list = Array.isArray(data[SK_HISTORY]) ? data[SK_HISTORY] : [];
    if (list.length === 0) {
      container.innerHTML = '<div style="text-align: center; color: #6c757d; margin-top: 20px;">История пуста.<br>Сгенерированные посты появятся здесь.</div>';
      return;
    }

    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    container.innerHTML = list.map((item) => {
      const d = new Date(item.date);
      const dateStr = d.toLocaleDateString('ru-RU') + ' ' + d.toLocaleTimeString('ru-RU');
      const keywordHtml = item.keyword ? `<span>Ключ: ${item.keyword}</span>` : '';
      const hasImage = item.imageUrl ? '<span style="color:#16a34a">Обложка ✓</span>' : '';

      return `
        <div class="history-item">
          <div class="history-date">${dateStr}</div>
          <div class="history-prompt">${item.prompt || 'Без темы'}</div>
          <div class="history-meta">
            ${keywordHtml}
            ${hasImage}
          </div>
          <button class="secondary history-copy" data-prompt="${(item.prompt || '').replace(/"/g, '&quot;')}">Повторить промпт</button>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.history-copy').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const prompt = e.target.getAttribute('data-prompt');
        navigator.clipboard.writeText(prompt).then(() => {
          const oldTxt = e.target.textContent;
          e.target.textContent = 'Скопировано ✓';
          e.target.classList.add('saved');
          setTimeout(() => {
            e.target.textContent = oldTxt;
            e.target.classList.remove('saved');
          }, 2000);
        });
      });
    });
  });
}

// ── Status Helpers ────────────────────────────────────────────────────────────

function showStatus(elementId, text, type) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = text;
  el.className = 'status show ' + type;
}

function clearStatus(elementId) {
  const el = document.getElementById(elementId);
  if (el) el.classList.remove('show');
}

// ── Start ─────────────────────────────────────────────────────────────────────
init();
