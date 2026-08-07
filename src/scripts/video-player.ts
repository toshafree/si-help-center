type VideoProvider = 'youtube' | 'rutube';

const STORAGE_KEY = 'si.videoProvider';
const PROVIDER_CHANGE_EVENT = 'si-video-provider-change';
const DEFAULT_PROVIDER: VideoProvider = 'rutube';
const PROVIDERS: VideoProvider[] = ['youtube', 'rutube'];
const PROVIDER_LABELS: Record<VideoProvider, string> = {
  youtube: 'YouTube',
  rutube: 'Rutube',
};

function isVideoProvider(value: unknown): value is VideoProvider {
  return value === 'youtube' || value === 'rutube';
}

function readProvider(): VideoProvider {
  try {
    const provider = localStorage.getItem(STORAGE_KEY);
    return isVideoProvider(provider) ? provider : DEFAULT_PROVIDER;
  } catch {
    return DEFAULT_PROVIDER;
  }
}

function saveProvider(provider: VideoProvider): void {
  try {
    localStorage.setItem(STORAGE_KEY, provider);
  } catch {
    // The player still works when storage is unavailable, but the choice is not persisted.
  }
}

function youtubeEmbedUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    let videoId: string | null | undefined;

    if (hostname === 'youtu.be') {
      videoId = url.pathname.split('/').filter(Boolean)[0];
    } else if (
      hostname === 'youtube.com' ||
      hostname === 'www.youtube.com' ||
      hostname === 'm.youtube.com' ||
      hostname === 'youtube-nocookie.com' ||
      hostname === 'www.youtube-nocookie.com'
    ) {
      if (url.pathname === '/watch') {
        videoId = url.searchParams.get('v');
      } else {
        videoId = url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1];
      }
    }

    if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) return undefined;
    return `https://www.youtube-nocookie.com/embed/${videoId}`;
  } catch {
    return undefined;
  }
}

function rutubeEmbedUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    if (hostname !== 'rutube.ru' && hostname !== 'www.rutube.ru') return undefined;

    const videoId = url.pathname.match(/^\/(?:video|play\/embed)\/([a-f0-9]{32})(?:\/|$)/i)?.[1];
    if (!videoId) return undefined;

    const embedUrl = new URL(`https://rutube.ru/play/embed/${videoId}/`);
    embedUrl.search = url.search;
    return embedUrl.toString();
  } catch {
    return undefined;
  }
}

function providerEmbedUrl(provider: VideoProvider, value: string): string | undefined {
  return provider === 'youtube' ? youtubeEmbedUrl(value) : rutubeEmbedUrl(value);
}

function announceProvider(provider: VideoProvider): void {
  saveProvider(provider);
  window.dispatchEvent(new CustomEvent(PROVIDER_CHANGE_EVENT, { detail: provider }));
}

class SpreadInsightVideo extends HTMLElement {
  private readonly availableProviders = new Map<VideoProvider, string>();
  private readonly providerButtons = new Map<VideoProvider, HTMLButtonElement>();
  private iframe?: HTMLIFrameElement;
  private activeProvider?: VideoProvider;

  private readonly handleProviderChange = (event: Event): void => {
    if (event instanceof CustomEvent && isVideoProvider(event.detail)) {
      this.showProvider(event.detail);
    }
  };

  connectedCallback(): void {
    if (!this.hasAttribute('data-initialized')) {
      for (const provider of PROVIDERS) {
        const source = this.getAttribute(provider);
        if (!source) continue;

        const embedUrl = providerEmbedUrl(provider, source);
        if (embedUrl) this.availableProviders.set(provider, embedUrl);
      }

      if (this.availableProviders.size === 0) {
        console.warn('Video player has no supported YouTube or Rutube URL.', this);
        return;
      }

      this.setAttribute('data-initialized', '');
      this.render();
    }

    window.addEventListener(PROVIDER_CHANGE_EVENT, this.handleProviderChange);
    this.showProvider(readProvider());
  }

  disconnectedCallback(): void {
    window.removeEventListener(PROVIDER_CHANGE_EVENT, this.handleProviderChange);
  }

  private render(): void {
    const fragment = document.createDocumentFragment();

    if (this.availableProviders.size > 1) {
      const toolbar = document.createElement('div');
      toolbar.className = 'si-video__toolbar';

      const label = document.createElement('span');
      label.className = 'si-video__provider-label';
      label.textContent = 'Смотреть на:';
      toolbar.append(label);

      const group = document.createElement('div');
      group.className = 'si-video__providers';
      group.setAttribute('role', 'group');
      group.setAttribute('aria-label', 'Видеоплатформа');

      for (const provider of PROVIDERS) {
        if (!this.availableProviders.has(provider)) continue;

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'si-video__provider';
        button.textContent = PROVIDER_LABELS[provider];
        button.setAttribute('aria-pressed', 'false');
        button.addEventListener('click', () => announceProvider(provider));
        this.providerButtons.set(provider, button);
        group.append(button);
      }

      toolbar.append(group);
      fragment.append(toolbar);
    }

    this.iframe = document.createElement('iframe');
    this.iframe.loading = 'lazy';
    this.iframe.allow =
      'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    this.iframe.allowFullscreen = true;
    this.iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    fragment.append(this.iframe);

    this.replaceChildren(fragment);
  }

  private showProvider(preferredProvider: VideoProvider): void {
    const provider = this.availableProviders.has(preferredProvider)
      ? preferredProvider
      : (PROVIDERS.find((candidate) => this.availableProviders.has(candidate)) ?? DEFAULT_PROVIDER);
    const embedUrl = this.availableProviders.get(provider);

    if (!embedUrl || !this.iframe) return;

    for (const [candidate, button] of this.providerButtons) {
      button.setAttribute('aria-pressed', String(candidate === provider));
    }

    this.dataset.provider = provider;
    if (this.activeProvider === provider) return;

    const title = this.getAttribute('title') || 'Видео';
    this.iframe.title = `${title} — ${PROVIDER_LABELS[provider]}`;
    this.iframe.src = embedUrl;
    this.activeProvider = provider;
  }
}

if (!customElements.get('si-video')) {
  customElements.define('si-video', SpreadInsightVideo);
}

window.addEventListener('storage', (event) => {
  if (event.key !== STORAGE_KEY) return;

  const provider = isVideoProvider(event.newValue) ? event.newValue : DEFAULT_PROVIDER;
  window.dispatchEvent(new CustomEvent(PROVIDER_CHANGE_EVENT, { detail: provider }));
});
