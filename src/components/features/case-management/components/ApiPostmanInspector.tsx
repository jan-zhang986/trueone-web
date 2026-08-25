/**
 * HTTP API 接口调试器 (ApiPostmanInspector)
 * 采用与测试工厂 (TestPage) 一致的视觉与交互规范
 */

import React, { useState } from 'react';
import { Play, Save, Plus, Trash2, Code2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface KeyValuePair {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
  description?: string;
}

export interface ApiPostmanInspectorProps {
  caseId?: string;
  caseName?: string;
  initialMethod?: HttpMethod;
  initialUrl?: string;
  onSave?: (data: any) => void;
  onClear?: () => void;
}

export function getTypeBadgeColor(type: string): string {
  const colors: Record<string, string> = {
    GET: 'bg-green-100 text-green-700',
    POST: 'bg-yellow-100 text-yellow-700',
    PUT: 'bg-blue-100 text-blue-700',
    DELETE: 'bg-red-100 text-red-700',
    PATCH: 'bg-purple-100 text-purple-700',
  };
  return colors[type.toUpperCase()] || 'bg-gray-100 text-gray-700';
}

const tabCls =
  'text-xs border-0 bg-transparent shadow-none data-[state=active]:bg-transparent data-[state=active]:text-gray-900 data-[state=active]:font-medium data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:rounded-none data-[state=active]:shadow-none text-gray-400 hover:text-gray-700 pb-2 px-2 transition-colors cursor-pointer';

export function ApiPostmanInspector({
  caseId,
  caseName = 'API 接口用例',
  initialMethod = 'POST',
  initialUrl = '/api/v1/cases/1024',
  onSave,
  onClear,
}: ApiPostmanInspectorProps) {
  // 1. Request State
  const [method, setMethod] = useState<HttpMethod>(initialMethod);
  const [url, setUrl] = useState<string>(initialUrl);
  const [activeReqTab, setActiveReqTab] = useState<'query' | 'header' | 'body' | 'assertions'>('query');
  const [responseTab, setResponseTab] = useState<string>('response-body');

  const [params, setParams] = useState<KeyValuePair[]>([
    { id: '1', key: 'page', value: '1', enabled: true },
    { id: '2', key: 'size', value: '20', enabled: true },
  ]);

  const [headers, setHeaders] = useState<KeyValuePair[]>([
    { id: '1', key: 'Content-Type', value: 'application/json', enabled: true },
    { id: '2', key: 'Authorization', value: 'Bearer {{token}}', enabled: true },
  ]);

  const [bodyType, setBodyType] = useState<'none' | 'json' | 'form-data' | 'raw'>('json');
  const [bodyContent, setBodyContent] = useState<string>(
    JSON.stringify({ username: 'admin', role: 'tester', timestamp: Date.now() }, null, 2)
  );

  const [assertions, setAssertions] = useState<KeyValuePair[]>([
    { id: '1', key: 'Status Code', value: '200', enabled: true },
    { id: '2', key: 'JSON Path $.code', value: '0', enabled: true },
  ]);

  // 2. Response State
  const [executing, setExecuting] = useState(false);
  const [response, setResponse] = useState<{
    status: number;
    statusText: string;
    durationMs: number;
    sizeKb: number;
    body: string;
    headers: Record<string, string>;
    curl: string;
  } | null>(null);

  const generateId = () => String(Date.now() + Math.random());

  const handleSend = async () => {
    if (!url.trim()) {
      toast.error('请输入接口地址');
      return;
    }
    setExecuting(true);
    setTimeout(() => {
      setExecuting(false);
      const mockResp = {
        status: 200,
        statusText: 'OK',
        durationMs: 45,
        sizeKb: 1.28,
        body: JSON.stringify(
          {
            code: 0,
            message: 'success',
            data: {
              caseId: caseId || 'API-1024',
              caseName,
              executedAt: new Date().toISOString(),
              assertionsPassed: assertions.filter((a) => a.enabled).length,
            },
          },
          null,
          2
        ),
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'server': 'aegis-runner-worker/1.0',
          'x-request-id': `req-${Math.random().toString(36).substring(2, 9)}`,
        },
        curl: `curl -X ${method} "${url}" \\\n  -H "Content-Type: application/json" \\\n  -d '${bodyContent.replace(/\n/g, '')}'`,
      };
      setResponse(mockResp);
      toast.success('请求执行成功 (200 OK)');
    }, 500);
  };

  const handleSave = () => {
    onSave?.({ method, url, params, headers, bodyType, bodyContent, assertions });
    toast.success('接口配置已保存');
  };

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(bodyContent);
      setBodyContent(JSON.stringify(parsed, null, 2));
      toast.success('JSON 格式化完成');
    } catch {
      toast.error('JSON 语法错误，无法格式化');
    }
  };

  const headerCount = headers.filter((h) => h.enabled && h.key.trim()).length;
  const queryCount = params.filter((p) => p.enabled && p.key.trim()).length;
  const assertionCount = assertions.filter((a) => a.enabled && a.key.trim()).length;
  const bodyCount = bodyType === 'none' ? 0 : 1;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-2xs">
      {/* 顶部请求 URL 行（与测试工厂 TestPage 1:1 保持一致） */}
      <div className="flex items-center gap-2 p-3 border-b border-gray-200">
        <Select value={method} onValueChange={(v) => setMethod(v as HttpMethod)}>
          <SelectTrigger className="w-24 h-8 text-xs font-semibold shrink-0 [&_[data-slot=select-value]]:hidden">
            <SelectValue />
            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getTypeBadgeColor(method)}`}>
              {method}
            </span>
          </SelectTrigger>
          <SelectContent>
            {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map((m) => (
              <SelectItem key={m} value={m}>
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getTypeBadgeColor(m)}`}>
                  {m}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="请输入接口地址"
          className="flex-1 min-w-[200px] h-8 text-xs font-mono border-gray-200"
        />

        <Button
          onClick={handleSend}
          disabled={executing}
          size="sm"
          className="h-8 px-3.5 bg-blue-600 hover:bg-blue-700 text-white font-normal text-xs gap-1.5 shadow-2xs shrink-0"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          {executing ? '发送中...' : '发送'}
        </Button>

        <Button
          onClick={handleSave}
          variant="outline"
          size="sm"
          className="h-8 px-3 text-xs gap-1.5 text-gray-700 border-gray-200 hover:bg-gray-50 shrink-0"
        >
          <Save className="w-3.5 h-3.5" />
          保存
        </Button>

        {onClear && (
          <Button
            onClick={onClear}
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1 shrink-0 font-normal ml-auto"
          >
            <Trash2 className="w-3.5 h-3.5" />
            清除配置
          </Button>
        )}
      </div>

      {/* 中部：请求参数 Tabs（紧凑对齐风格） */}
      <div className="p-3">
        <Tabs value={activeReqTab} onValueChange={(v: any) => setActiveReqTab(v)}>
          <div className="border-b border-gray-200 mb-3">
            <TabsList className="h-8 bg-transparent rounded-none justify-start p-0 gap-6 w-auto inline-flex">
              <TabsTrigger value="query" className={tabCls}>
                <span className="flex items-center gap-1.5">
                  Params
                  {queryCount > 0 && (
                    <span className="bg-gray-200 text-gray-600 text-xs font-medium px-1.5 py-0.5 rounded">
                      {queryCount}
                    </span>
                  )}
                </span>
              </TabsTrigger>
              <TabsTrigger value="header" className={tabCls}>
                <span className="flex items-center gap-1.5">
                  Header
                  {headerCount > 0 && (
                    <span className="bg-gray-200 text-gray-600 text-xs font-medium px-1.5 py-0.5 rounded">
                      {headerCount}
                    </span>
                  )}
                </span>
              </TabsTrigger>
              <TabsTrigger value="body" className={tabCls}>
                <span className="flex items-center gap-1.5">
                  Body
                  {bodyCount > 0 && (
                    <span className="bg-gray-200 text-gray-600 text-xs font-medium px-1.5 py-0.5 rounded">
                      {bodyCount}
                    </span>
                  )}
                </span>
              </TabsTrigger>
              <TabsTrigger value="assertions" className={tabCls}>
                <span className="flex items-center gap-1.5">
                  断言
                  {assertionCount > 0 && (
                    <span className="bg-gray-200 text-gray-600 text-xs font-medium px-1.5 py-0.5 rounded">
                      {assertionCount}
                    </span>
                  )}
                </span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Params (Query) Tab */}
          <TabsContent value="query" className="mt-0 space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs text-gray-500 px-2 font-medium">
              <div className="col-span-1 text-center">启用</div>
              <div className="col-span-5">参数名</div>
              <div className="col-span-5">参数值</div>
              <div className="col-span-1 text-center">操作</div>
            </div>
            <div className="space-y-2">
              {params.map((p) => (
                <div key={p.id} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-1 flex justify-center">
                    <input
                      type="checkbox"
                      checked={p.enabled}
                      onChange={(e) =>
                        setParams((prev) =>
                          prev.map((x) => (x.id === p.id ? { ...x, enabled: e.target.checked } : x))
                        )
                      }
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </div>
                  <Input
                    className="col-span-5 h-8 text-xs font-mono border-gray-200"
                    placeholder="Params Name"
                    value={p.key}
                    onChange={(e) =>
                      setParams((prev) =>
                        prev.map((x) => (x.id === p.id ? { ...x, key: e.target.value } : x))
                      )
                    }
                  />
                  <Input
                    className="col-span-5 h-8 text-xs font-mono border-gray-200"
                    placeholder="Params Value"
                    value={p.value}
                    onChange={(e) =>
                      setParams((prev) =>
                        prev.map((x) => (x.id === p.id ? { ...x, value: e.target.value } : x))
                      )
                    }
                  />
                  <div className="col-span-1 flex justify-center">
                    <button
                      type="button"
                      className="text-gray-400 hover:text-red-600 transition-colors p-1"
                      onClick={() => setParams((prev) => prev.filter((x) => x.id !== p.id))}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-gray-600 hover:text-gray-900 h-7 px-2 mt-1"
              onClick={() => setParams((prev) => [...prev, { id: generateId(), key: '', value: '', enabled: true }])}
            >
              <Plus className="w-3 h-3 mr-1" />
              添加Params参数
            </Button>
          </TabsContent>

          {/* Header Tab */}
          <TabsContent value="header" className="mt-0 space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs text-gray-500 px-2 font-medium">
              <div className="col-span-1 text-center">启用</div>
              <div className="col-span-5">参数名</div>
              <div className="col-span-5">参数值</div>
              <div className="col-span-1 text-center">操作</div>
            </div>
            <div className="space-y-2">
              {headers.map((h) => (
                <div key={h.id} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-1 flex justify-center">
                    <input
                      type="checkbox"
                      checked={h.enabled}
                      onChange={(e) =>
                        setHeaders((prev) =>
                          prev.map((x) => (x.id === h.id ? { ...x, enabled: e.target.checked } : x))
                        )
                      }
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </div>
                  <Input
                    className="col-span-5 h-8 text-xs font-mono border-gray-200"
                    placeholder="Header Name"
                    value={h.key}
                    onChange={(e) =>
                      setHeaders((prev) =>
                        prev.map((x) => (x.id === h.id ? { ...x, key: e.target.value } : x))
                      )
                    }
                  />
                  <Input
                    className="col-span-5 h-8 text-xs font-mono border-gray-200"
                    placeholder="Header Value"
                    value={h.value}
                    onChange={(e) =>
                      setHeaders((prev) =>
                        prev.map((x) => (x.id === h.id ? { ...x, value: e.target.value } : x))
                      )
                    }
                  />
                  <div className="col-span-1 flex justify-center">
                    <button
                      type="button"
                      className="text-gray-400 hover:text-red-600 transition-colors p-1"
                      onClick={() => setHeaders((prev) => prev.filter((x) => x.id !== h.id))}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-gray-600 hover:text-gray-900 h-7 px-2 mt-1"
              onClick={() => setHeaders((prev) => [...prev, { id: generateId(), key: '', value: '', enabled: true }])}
            >
              <Plus className="w-3 h-3 mr-1" />
              添加Header
            </Button>
          </TabsContent>

          {/* Body Tab */}
          <TabsContent value="body" className="mt-0 space-y-2">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-5 text-xs text-gray-700">
                {(['none', 'json', 'form-data', 'raw'] as const).map((v) => (
                  <label key={v} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="apiBodyTypeRadio"
                      value={v}
                      checked={bodyType === v}
                      onChange={() => setBodyType(v)}
                      className="text-blue-600"
                    />
                    {v === 'json' ? 'JSON' : v}
                  </label>
                ))}
              </div>
              {bodyType === 'json' && (
                <Button
                  type="button"
                  onClick={handleFormatJson}
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-blue-600 hover:bg-blue-50 gap-1"
                >
                  <Code2 className="w-3 h-3" /> 格式化 JSON
                </Button>
              )}
            </div>
            {bodyType === 'none' && (
              <div className="flex items-center justify-center h-28 text-gray-400 text-xs border border-dashed border-gray-200 rounded">
                请选择数据格式并填入
              </div>
            )}
            {bodyType !== 'none' && (
              <Textarea
                value={bodyContent}
                onChange={(e) => setBodyContent(e.target.value)}
                placeholder="请输入请求体内容..."
                className="font-mono text-xs min-h-[110px] bg-gray-50 text-gray-900 border-gray-200 p-3 rounded focus:bg-white transition-colors"
              />
            )}
          </TabsContent>

          {/* Assertions Tab */}
          <TabsContent value="assertions" className="mt-0 space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs text-gray-500 px-2 font-medium">
              <div className="col-span-1 text-center">启用</div>
              <div className="col-span-5">断言规则 (Rule)</div>
              <div className="col-span-5">预期目标值 (Expected)</div>
              <div className="col-span-1 text-center">操作</div>
            </div>
            <div className="space-y-2">
              {assertions.map((a) => (
                <div key={a.id} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-1 flex justify-center">
                    <input
                      type="checkbox"
                      checked={a.enabled}
                      onChange={(e) =>
                        setAssertions((prev) =>
                          prev.map((x) => (x.id === a.id ? { ...x, enabled: e.target.checked } : x))
                        )
                      }
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </div>
                  <Input
                    className="col-span-5 h-8 text-xs font-mono border-gray-200"
                    placeholder="如 Status Code / JSONPath $.code"
                    value={a.key}
                    onChange={(e) =>
                      setAssertions((prev) =>
                        prev.map((x) => (x.id === a.id ? { ...x, key: e.target.value } : x))
                      )
                    }
                  />
                  <Input
                    className="col-span-5 h-8 text-xs font-mono border-gray-200"
                    placeholder="预期值"
                    value={a.value}
                    onChange={(e) =>
                      setAssertions((prev) =>
                        prev.map((x) => (x.id === a.id ? { ...x, value: e.target.value } : x))
                      )
                    }
                  />
                  <div className="col-span-1 flex justify-center">
                    <button
                      type="button"
                      className="text-gray-400 hover:text-red-600 transition-colors p-1"
                      onClick={() => setAssertions((prev) => prev.filter((x) => x.id !== a.id))}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-gray-600 hover:text-gray-900 h-7 px-2 mt-1"
              onClick={() => setAssertions((prev) => [...prev, { id: generateId(), key: '', value: '', enabled: true }])}
            >
              <Plus className="w-3 h-3 mr-1" />
              添加断言规则
            </Button>
          </TabsContent>
        </Tabs>
      </div>

      {/* 底部响应区域（与测试工厂 TestPageResponseSection 1:1 一致） */}
      <div className="border-t border-gray-200">
        <Tabs value={responseTab} onValueChange={setResponseTab}>
          <div className="flex items-center justify-between border-b border-gray-200 px-3">
            <TabsList className="h-8 bg-transparent rounded-none justify-start p-0 gap-6 w-auto inline-flex">
              <TabsTrigger value="response-body" className={tabCls}>
                响应体
              </TabsTrigger>
              <TabsTrigger value="response-header" className={tabCls}>
                响应头
              </TabsTrigger>
              <TabsTrigger value="response-curl" className={tabCls}>
                cURL
              </TabsTrigger>
            </TabsList>

            {response && (
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-500">状态:</span>
                  <span
                    className={`font-medium ${
                      response.status >= 200 && response.status < 300 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {response.status} {response.statusText}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-500">耗时:</span>
                  <span className="font-medium text-gray-600">{response.durationMs}ms</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-500">大小:</span>
                  <span className="font-medium text-gray-600">{response.sizeKb}KB</span>
                </div>
              </div>
            )}
          </div>

          <div className="p-3">
            {executing ? (
              <div className="flex flex-col items-center justify-center py-6 text-gray-400 gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
                <p className="text-xs">正在发送请求...</p>
              </div>
            ) : response ? (
              <>
                <TabsContent value="response-body" className="mt-0">
                  <pre className="text-xs font-mono bg-gray-50 p-2.5 rounded border border-gray-200 text-gray-700 whitespace-pre-wrap break-all max-h-52 overflow-auto">
                    {response.body}
                  </pre>
                </TabsContent>
                <TabsContent value="response-header" className="mt-0">
                  <div className="border border-gray-200 rounded text-xs font-mono max-h-52 overflow-auto">
                    {Object.entries(response.headers).map(([k, v]) => (
                      <div key={k} className="flex border-b border-gray-100 last:border-0 px-3 py-1.5 hover:bg-gray-50">
                        <span className="w-40 text-gray-500 font-medium shrink-0">{k}:</span>
                        <span className="text-gray-700 truncate">{v}</span>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="response-curl" className="mt-0">
                  <pre className="text-xs font-mono bg-gray-50 p-2.5 rounded border border-gray-200 text-gray-700 whitespace-pre-wrap break-all">
                    {response.curl}
                  </pre>
                </TabsContent>
              </>
            ) : (
              <div className="py-6 text-center text-gray-400 text-xs flex flex-col items-center justify-center gap-2">
                <Play className="w-5 h-5 text-gray-300 stroke-[1.5]" />
                <span>暂无响应数据，点击上方「发送」获取实时响应</span>
              </div>
            )}
          </div>
        </Tabs>
      </div>
    </div>
  );
}
