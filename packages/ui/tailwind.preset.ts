import type { Config } from 'tailwindcss';

/** Shared Tailwind theme — shadcn/ui tokens (import via `@config` in app CSS). */
const preset = {
  theme: {
    extend: {
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--layout-sidebar-bg))',
          foreground: 'hsl(var(--layout-sidebar-fg))',
          border: 'hsl(var(--layout-sidebar-border))',
          brand: 'hsl(var(--layout-sidebar-brand-fg))',
          'brand-muted': 'hsl(var(--layout-sidebar-brand-muted-fg))',
          'nav-default': 'hsl(var(--layout-sidebar-nav-default))',
          'nav-hover': 'hsl(var(--layout-sidebar-nav-hover-bg))',
          'nav-hover-fg': 'hsl(var(--layout-sidebar-nav-hover-fg))',
          'nav-active': 'hsl(var(--layout-sidebar-nav-active-bg))',
          'nav-active-fg': 'hsl(var(--layout-sidebar-nav-active-fg))',
          'group-border': 'hsl(var(--layout-sidebar-group-border))',
        },
        header: {
          DEFAULT: 'hsl(var(--layout-header-bg))',
          foreground: 'hsl(var(--layout-header-fg))',
          border: 'hsl(var(--layout-header-border))',
          'menu-hover': 'hsl(var(--layout-header-menu-btn-hover-bg))',
        },
        footer: {
          DEFAULT: 'hsl(var(--layout-footer-bg))',
          foreground: 'hsl(var(--layout-footer-fg))',
          border: 'hsl(var(--layout-footer-border))',
        },
        drawer: {
          DEFAULT: 'hsl(var(--layout-drawer-bg))',
          foreground: 'hsl(var(--layout-drawer-fg))',
          border: 'hsl(var(--layout-drawer-border))',
          'close-hover': 'hsl(var(--layout-drawer-close-hover-bg))',
        },
        breadcrumb: {
          DEFAULT: 'hsl(var(--layout-breadcrumb-text))',
          separator: 'hsl(var(--layout-breadcrumb-separator))',
          active: 'hsl(var(--layout-breadcrumb-active-text))',
          'link-hover': 'hsl(var(--layout-breadcrumb-link-hover-text))',
        },
        banner: {
          trial: {
            DEFAULT: 'hsl(var(--layout-banner-trial-bg))',
            foreground: 'hsl(var(--layout-banner-trial-fg))',
            border: 'hsl(var(--layout-banner-trial-border))',
          },
          suspended: {
            DEFAULT: 'hsl(var(--layout-banner-suspended-bg))',
            foreground: 'hsl(var(--layout-banner-suspended-fg))',
            border: 'hsl(var(--layout-banner-suspended-border))',
          },
          error: {
            DEFAULT: 'hsl(var(--layout-banner-error-bg))',
            foreground: 'hsl(var(--layout-banner-error-fg))',
            border: 'hsl(var(--layout-banner-error-border))',
          },
          success: {
            DEFAULT: 'hsl(var(--layout-banner-success-bg))',
            foreground: 'hsl(var(--layout-banner-success-fg))',
            border: 'hsl(var(--layout-banner-success-border))',
          },
          info: {
            DEFAULT: 'hsl(var(--layout-banner-info-bg))',
            foreground: 'hsl(var(--layout-banner-info-fg))',
            border: 'hsl(var(--layout-banner-info-border))',
          },
        },
      },
      width: {
        sidebar: 'var(--layout-sidebar-width)',
        drawer: 'var(--layout-drawer-width)',
      },
      minHeight: {
        header: 'var(--layout-header-height)',
      },
    },
  },
} satisfies Config;

export default preset;
