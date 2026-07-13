import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import appCss from '../styles.css?url'

// Inline script: apply the dark class to <html> before the first
// paint, so the user doesn't see a flash of the wrong theme. Mirrors
// the localStorage key + system-pref fallback used by i18n's
// `getTheme` / `applyTheme`.
const THEME_INIT_SCRIPT = `(function(){try{var stored=localStorage.getItem('commute.theme');var mode=(stored==='light'||stored==='dark')?stored:null;var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode?mode:(prefersDark?'dark':'light');document.documentElement.classList.toggle('dark',resolved==='dark');}catch(e){}})();`

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'commute',
      },
      {
        name: 'description',
        content:
          'Next arrivals at the Jakarta public-transport stops closest to you.',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="min-h-dvh bg-bg text-fg antialiased">
        {children}
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
