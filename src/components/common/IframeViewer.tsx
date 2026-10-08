import React, { useState } from 'react';
import { ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';

interface IframeViewerProps {
  url: string;
  title?: string;
}

export function IframeViewer({ url, title }: IframeViewerProps) {
  const [key, setKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const handleRefresh = () => {
    setIsLoading(true);
    setKey((prev) => prev + 1);
  };

  const handleOpenExternal = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex-1 w-full h-full min-h-0 flex flex-col bg-white overflow-hidden">
      {/* 顶部控制栏 */}
      <div className="h-10 border-b border-gray-200 px-4 flex items-center justify-between bg-gray-50/70 shrink-0">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="text-xs font-semibold text-gray-700 truncate">{title || '内嵌页面'}</span>
          <span className="text-[11px] text-gray-400 font-mono truncate max-w-md">{url}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleRefresh}
            className="p-1 rounded text-gray-500 hover:text-gray-800 hover:bg-gray-200/60 transition-colors"
            title="重新加载"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleOpenExternal}
            className="p-1 rounded text-gray-500 hover:text-gray-800 hover:bg-gray-200/60 transition-colors flex items-center gap-1 text-xs"
            title="在新标签页中打开"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Iframe 区域 */}
      <div className="flex-1 w-full h-full relative min-h-0">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
              <span>页面加载中...</span>
            </div>
          </div>
        )}
        <iframe
          key={key}
          src={url}
          title={title || 'embedded-page'}
          className="w-full h-full border-0"
          onLoad={() => setIsLoading(false)}
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        />
      </div>
    </div>
  );
}
