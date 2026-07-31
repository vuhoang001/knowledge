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
  themes: [
    '@docusaurus/theme-mermaid',
    [
      // Search chạy client-side: index sinh lúc `npm run build`, không cần server.
      // Dev server (`npm start`) KHÔNG có search — chỉ xem được ở `npm run build && npm run serve`.
      require.resolve('@easyops-cn/docusaurus-search-local'),
      {
        // docs/ phục vụ ở gốc — để mặc định '/docs' là index rỗng
        docsRouteBasePath: '/',
        indexBlog: false,
        hashed: true,
        // 'vi' bắt buộc: trimmer mặc định của lunr dùng \W kiểu ASCII nên cắt mất
        // chữ "đ" đầu từ ("điều" → "iều"). Trimmer vi phủ đ/ă/â/ê/ô/ơ/ư.
        language: ['en', 'vi'],
        // Nhận MẢNG ngôn ngữ, không phải boolean. Stop word tiếng Anh nuốt mất
        // các âm tiếng Việt hợp lệ ("do", "no", "to", "so")
        removeDefaultStopWordFilter: ['en'],
        highlightSearchTermsOnTargetPage: true,
        searchResultLimits: 10,
        searchResultContextMaxLength: 80,
      },
    ],
  ],

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
          { to: '/catalog', label: 'Thư viện', position: 'right' },
          { to: '/glossary/', label: 'Glossary', position: 'right' },
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
