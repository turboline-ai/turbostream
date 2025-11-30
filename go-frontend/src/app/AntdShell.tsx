"use client";

import React from 'react';
import { Layout, ConfigProvider, App } from 'antd';
import { ideTheme } from '@/theme/ideAntd';

const { Content } = Layout;

export default function AntdShell({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider theme={ideTheme}>
      <App>
        {children}
      </App>
    </ConfigProvider>
  );
}
