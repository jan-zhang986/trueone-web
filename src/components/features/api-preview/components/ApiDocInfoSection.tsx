import { Copy, Lightbulb, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export interface ApiDocInfoSectionProps {
  definitionName: string;
  definitionDescription?: string;
  protocol: string;
  httpMethod: string;
  url: string;
  getTypeBadgeColor: (t: string) => string;
  formatTime: (ts?: number | null) => string;
  createdAt?: number;
  updatedAt?: number;
  createUser?: string;
  userNameMap: Map<string, string>;
  directoryLabel: string;
  tags?: string[];
  onCopyUrl: () => void;
  isSyncData?: boolean;
  isSavingSyncData?: boolean;
  onSaveSyncData?: () => void;
}

export function ApiDocInfoSection({
  definitionName,
  definitionDescription,
  protocol,
  httpMethod,
  url,
  getTypeBadgeColor,
  formatTime,
  createdAt,
  updatedAt,
  createUser,
  userNameMap,
  directoryLabel,
  tags,
  onCopyUrl,
  isSyncData,
  isSavingSyncData,
  onSaveSyncData,
}: ApiDocInfoSectionProps) {
  const urlShort = url.length > 100 ? `${url.substring(0, 100)}...` : url;
  const copyBtn = (
    <button
      onClick={onCopyUrl}
      className="text-gray-400 hover:text-gray-600 transition-colors"
      title="复制URL"
    >
      <Copy className="w-4 h-4" />
    </button>
  );

  return (
    <div className="border-b border-gray-200 bg-white flex-shrink-0 px-6 py-4">
      <div className="space-y-3">
        {(protocol === 'HTTP' || protocol === 'DUBBO') && (
          <div className="text-sm flex items-center gap-4">
            <div>
              <span className="text-gray-600">接口名称：</span>
              <span className="font-medium text-green-600 ml-2">{definitionName}</span>
            </div>
            {definitionDescription && (
              <div>
                <span className="text-gray-600">描述：</span>
                <span className="text-gray-900 ml-2">{definitionDescription}</span>
              </div>
            )}
          </div>
        )}

        {protocol !== 'HTTP' && protocol !== 'DUBBO' && protocol !== 'SQL' && definitionDescription && (
          <div className="text-sm">
            <span className="text-gray-600">描述：</span>
            <span className="text-gray-900 ml-2">{definitionDescription}</span>
          </div>
        )}

        {protocol === 'HTTP' && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">接口地址：</span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeBadgeColor(httpMethod)}`}>
              {httpMethod}
            </span>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded border border-gray-200">
              <code className="text-sm text-gray-700 font-mono">{urlShort}</code>
              {copyBtn}
            </div>
          </div>
        )}

        {protocol === 'DUBBO' && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">接口地址：</span>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded border border-gray-200">
              <code className="text-sm text-gray-700 font-mono">{urlShort}</code>
              {copyBtn}
            </div>
          </div>
        )}

        {protocol !== 'HTTP' &&
          protocol !== 'DUBBO' &&
          (protocol === 'ROCKETMQ' || protocol === 'FILE') && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded border border-gray-200">
                <code className="text-sm text-gray-700 font-mono">{urlShort}</code>
                {copyBtn}
              </div>
            </div>
          )}

        <div className="flex items-center gap-6 text-xs text-gray-500 flex-wrap">
          <div>
            <span className="text-gray-400">创建时间：</span>
            <span>{formatTime(createdAt)}</span>
          </div>
          <div>
            <span className="text-gray-400">修改时间：</span>
            <span>{formatTime(updatedAt)}</span>
          </div>
          <div>
            <span className="text-gray-400">负责人：</span>
            <span>{createUser ? userNameMap.get(createUser) || createUser : '-'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div>
              <span className="text-gray-400">目录：</span>
              <span>{directoryLabel}</span>
            </div>
            {tags && tags.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="inline-flex items-center gap-1">
                    <span className="text-gray-400">标签：</span>
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs cursor-pointer hover:bg-gray-200 transition-colors">
                      <span>{tags[0]}</span>
                      <Lightbulb className="w-3 h-3 text-gray-400" />
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <div className="flex flex-col gap-1">
                    <div className="font-medium mb-1">全部标签：</div>
                    <div className="flex flex-wrap gap-1">
                      {tags.map((tag, i) => (
                        <span key={i} className="px-1.5 py-0.5 bg-white/20 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          {isSyncData && onSaveSyncData && (
            <Button
              size="sm"
              onClick={onSaveSyncData}
              disabled={isSavingSyncData}
              className="h-8"
            >
              <Save className="w-4 h-4 mr-1" />
              {isSavingSyncData ? '保存中...' : '保存同步数据'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
