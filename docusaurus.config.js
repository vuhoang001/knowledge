// @ts-check
// Cấu hình Docusaurus cho Second Brain.
// docs/ được phục vụ ở gốc site (routeBasePath: '/') — kho này là wiki, không có landing page riêng.

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Second Brain',
  tagline: 'Wikipedia cá nhân — Software / Data Engineering',
  // Project page: site nằm dưới /<tên repo>/ — baseUrl sai là vỡ toàn bộ CSS + link
  url: 'https://vuhoang001.github.io',
  baseUrl: '/knowledge/',
  organizationName: 'vuhoang001',
  projectName: 'knowledge',

  onBrokenLinks: 'throw',
  onBrokenAnchors: 'warn',

  i18n: {
    defaultLocale: 'vi',
    locales: ['vi'],
  },

  // Mermaid: bật cả parser markdown lẫn theme, thiếu một trong hai là fence không render
  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
  },
  themes: ['@docusaurus/theme-mermaid'],

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          path: 'docs',
          routeBasePath: '/',
          sidebarPath: require.resolve('./sidebars.js'),
          showLastUpdateTime: true,
          // inbox/ và templates/ nằm ngoài docs/ nên không lên site — đúng chủ ý
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: 'Second Brain',
        items: [
          { type: 'docSidebar', sidebarId: 'main', position: 'left', label: 'Docs' },
          { to: '/data-modeling/', label: 'Data Modeling', position: 'left' },
          { to: '/etl/dbt/', label: 'dbt', position: 'left' },
          { to: '/glossary/', label: 'Glossary', position: 'right' },
          { to: '/cheatsheets/', label: 'Cheatsheets', position: 'right' },
        ],
      },
      footer: {
        style: 'dark',
        copyright:
          'Chưa chạy được thì chưa gọi là học — <code>verified_at</code> trống nghĩa là chưa kiểm chứng.',
      },
      prism: {
        additionalLanguages: ['sql', 'yaml', 'bash', 'json', 'python'],
      },
      mermaid: {
        theme: { light: 'neutral', dark: 'dark' },
      },
      tableOfContents: {
        minHeadingLevel: 2,
        maxHeadingLevel: 3,
      },
    }),
};

module.exports = config;
