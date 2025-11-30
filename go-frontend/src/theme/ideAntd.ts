import { theme } from 'antd';

export const ideSeed = {
  colorBgBase: '#0e1116', // editor bg
  colorBgContainer: '#151922', // panels/cards
  colorTextBase: '#e8ecf3',
  colorTextSecondary: '#98a2b3',
  colorBorder: '#232837',
  colorPrimary: '#5aa3ff', // links / accents
  colorSuccess: '#62c2a0',
  colorWarning: '#e7b95f',
  borderRadius: 0,
};

export const ideTheme = {
  algorithm: theme.darkAlgorithm,
  token: ideSeed,
  components: {
    Layout: { headerBg: '#151922', bodyBg: '#0e1116', siderBg: '#121620', headerHeight: 56 },
    Menu: { darkItemBg: '#121620', darkSubMenuItemBg: '#111520', itemSelectedBg: '#111a2b' },
    Card: { colorBorderSecondary: '#232837', headerBg: '#151922' },
    Tabs: { itemSelectedColor: '#e8ecf3', itemHoverColor: '#d9e6ff' },
    Button: { defaultBg: '#101624', defaultBorderColor: '#232837' },
  },
} as const;

export type IdeTheme = typeof ideTheme;
