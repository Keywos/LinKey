import {
  ViewPlugin,
  EditorView,
  Decoration,
  DecorationSet,
  MatchDecorator,
  WidgetType,
  ViewUpdate,
} from '@codemirror/view';
import { Extension, Range } from '@codemirror/state';
import { showToast } from 'vant';

const pathStr = '🔗';
const defaultRegexp = /\b((?:https?|ftp):\/\/[^\s/$.?#,].[^\s,]*)\b/gi;

export interface HyperLinkState {
  at: number;
  url: string;
  anchor: HyperLinkExtensionOptions['anchor'];
}

class HyperLinkIcon extends WidgetType {
  private readonly state: HyperLinkState;
  constructor(state: HyperLinkState) {
    super();
    this.state = state;
  }
  eq(other: HyperLinkIcon) {
    return this.state.url === other.state.url && this.state.at === other.state.at;
  }
  ignoreEvent() {
    return true;
  }
  toDOM() {
    const wrapper = document.createElement('button');
    wrapper.type = 'button';
    wrapper.tabIndex = -1;
    wrapper.innerHTML = pathStr;
    wrapper.className = 'cm-hyper-link-icon';
    wrapper.title = '复制链接';
    wrapper.setAttribute('aria-label', '复制链接');
    const stopEditorEvent = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
    };
    wrapper.addEventListener('pointerdown', stopEditorEvent);
    wrapper.addEventListener('mousedown', stopEditorEvent);
    wrapper.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
        await navigator.clipboard.writeText(this.state.url);
        showToast(`已复制链接: ${this.state.url.slice(0, 4)}...${this.state.url.slice(-6)}`);
      } catch {
        showToast('复制失败，请使用 HTTPS 或授予剪贴板权限');
      }
    });
    return wrapper;
  }
}

function hyperLinkDecorations(view: EditorView, anchor?: HyperLinkExtensionOptions['anchor']) {
    const widgets: Array<Range<Decoration>> = [];
    const doc = view.state.doc;
    let match;

    while ((match = defaultRegexp.exec(doc.toString())) !== null) {
        const from = match.index;
        const to = from + match[0].length;
        const widget = Decoration.widget({
            widget: new HyperLinkIcon({
                at: to,
                url: match[0],
                anchor,
            }),
            side: 1,
        });
        widgets.push(widget.range(to));
    }

    return Decoration.set(widgets);
}

const linkDecorator = (
  regexp?: RegExp,
  matchData?: Record<string, string>,
  matchFn?: (str: string, input: string, from: number, to: number) => string,
  anchor?: HyperLinkExtensionOptions['anchor'],
) =>
  new MatchDecorator({
    regexp: regexp || defaultRegexp,
    decorate: (add, from, to, match, view) => {
      const url = match[0];
      let urlStr = matchFn && typeof matchFn === 'function' ? matchFn(url, match.input, from, to) : url;
      if (matchData && matchData[url]) {
        urlStr = matchData[url];
      }
      const start = to,
        end = to;
      const linkIcon = new HyperLinkIcon({ at: start, url: urlStr, anchor });
      add(from, to, Decoration.mark({ class: 'cm-hyper-link-underline' }));
      add(start, end, Decoration.widget({ widget: linkIcon, side: 1 }));
    },
  });

export type HyperLinkExtensionOptions = {
  regexp?: RegExp;
  match?: Record<string, string>;
  handle?: (value: string, input: string, from: number, to: number) => string;
  anchor?: (dom: HTMLButtonElement) => HTMLButtonElement;
};

export function hyperLinkExtension({ regexp, match, handle, anchor }: HyperLinkExtensionOptions = {}) {
  return ViewPlugin.fromClass(
    class HyperLinkView {
      decorator?: MatchDecorator;
      decorations: DecorationSet;
      constructor(view: EditorView) {
        if (regexp) {
          this.decorator = linkDecorator(regexp, match, handle, anchor);
          this.decorations = this.decorator.createDeco(view);
        } else {
          this.decorations = hyperLinkDecorations(view, anchor);
        }
      }
      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          if (regexp && this.decorator) {
            this.decorations = this.decorator.updateDeco(update, this.decorations);
          } else {
            this.decorations = hyperLinkDecorations(update.view, anchor);
          }
        }
      }
    },
    {
      decorations: (v) => v.decorations,
    },
  );
}

export const hyperLinkStyle = EditorView.baseTheme({
  '.cm-hyper-link-icon': {
    display: 'inline-block',
    verticalAlign: 'middle',
    marginLeft: '0.2ch',
    padding: '0',
    border: '0',
    background: 'transparent',
    cursor: 'pointer',
  },
  '.cm-hyper-link-icon svg': {
    display: 'block',
  },
  '.cm-hyper-link-underline': {
    textDecoration: 'underline',
  },
});

export const hyperLink: Extension = [hyperLinkExtension(), hyperLinkStyle];
