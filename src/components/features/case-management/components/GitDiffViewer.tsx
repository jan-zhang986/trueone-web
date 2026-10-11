import React, { useState, useMemo } from 'react';
import {
  GitCommit,
  GitCompare,
  FileCode2,
  Clock,
  User,
  Copy,
  Check,
  RotateCcw,
  Plus,
  Minus,
  Sparkles,
  ChevronRight,
  History,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { GitCommitItem, FileGitHistoryResult } from '@/services/case-management/service-repo-case';

export interface GitDiffViewerProps {
  filePath: string;
  gitHistory: FileGitHistoryResult | null;
  loading: boolean;
  onRefresh?: () => void;
  draftCode?: string;
  originalCode?: string;
  onCommitDraft?: () => void;
}

interface ParsedDiffLine {
  type: 'add' | 'del' | 'header' | 'chunk' | 'normal';
  content: string;
  oldLine?: number;
  newLine?: number;
}

function parseUnifiedDiff(rawDiff: string): ParsedDiffLine[] {
  if (!rawDiff || !rawDiff.trim()) return [];
  const lines = rawDiff.split('\n');
  const result: ParsedDiffLine[] = [];

  let oldLineNum = 0;
  let newLineNum = 0;

  for (const line of lines) {
    if (
      line.startsWith('diff --git') ||
      line.startsWith('index ') ||
      line.startsWith('---') ||
      line.startsWith('+++')
    ) {
      result.push({ type: 'header', content: line });
    } else if (line.startsWith('@@')) {
      const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) {
        oldLineNum = parseInt(match[1], 10);
        newLineNum = parseInt(match[2], 10);
      }
      result.push({ type: 'chunk', content: line });
    } else if (line.startsWith('+')) {
      result.push({ type: 'add', content: line.slice(1), newLine: newLineNum++ });
    } else if (line.startsWith('-')) {
      result.push({ type: 'del', content: line.slice(1), oldLine: oldLineNum++ });
    } else {
      result.push({
        type: 'normal',
        content: line.startsWith(' ') ? line.slice(1) : line,
        oldLine: oldLineNum > 0 ? oldLineNum++ : undefined,
        newLine: newLineNum > 0 ? newLineNum++ : undefined,
      });
    }
  }
  return result;
}

export function GitDiffViewer({
  filePath,
  gitHistory,
  loading,
  onRefresh,
  draftCode,
  originalCode,
  onCommitDraft,
}: GitDiffViewerProps) {
  const [selectedTarget, setSelectedTarget] = useState<string>('HEAD');
  const [copiedSha, setCopiedSha] = useState<string | null>(null);

  // 检查前端草稿是否未保存
  const hasDraftChanges = useMemo(() => {
    return draftCode !== undefined && draftCode !== originalCode;
  }, [draftCode, originalCode]);

  // 可选视图目标列表 (未保存草稿、工作区未提交、各 Commit 记录)
  const commits = gitHistory?.commits || [];

  // 计算当前选中的 Diff 文本和元信息
  const currentDiffData = useMemo(() => {
    if (selectedTarget === 'draft' && hasDraftChanges) {
      return {
        isDraft: true,
        isUncommitted: false,
        title: '在线编辑器本地未提交草稿',
        message: '当前编辑器中存在已修改但尚未 Commit 到 Git 的代码变动',
        author: '当前登录用户',
        date: '刚刚 (本地缓存)',
        hash: 'DRAFT',
        shortHash: 'DRAFT',
        diffText: '', // 草稿暂用纯对比或提示
        linesAdded: 0,
        linesDel: 0,
      };
    }

    if (selectedTarget === 'working-tree' && gitHistory?.hasWorkingTreeChanges) {
      return {
        isDraft: false,
        isUncommitted: true,
        title: '工作区未提交变更 (Working Tree)',
        message: '本地文件已修改，尚未生成 Git Commit',
        author: 'Working Directory',
        date: '未暂存',
        hash: 'UNCOMMITTED',
        shortHash: 'UNCOMMITTED',
        diffText: gitHistory.uncommittedDiff || '',
        linesAdded: 0,
        linesDel: 0,
      };
    }

    const c = commits.find((it) => it.hash === selectedTarget) || commits[0];
    if (c) {
      return {
        isDraft: false,
        isUncommitted: false,
        title: c.message,
        message: c.message,
        author: c.author,
        date: c.date,
        hash: c.hash,
        shortHash: c.shortHash,
        diffText: c.diff,
        linesAdded: c.linesAdded,
        linesDel: c.linesDel,
      };
    }

    return null;
  }, [selectedTarget, hasDraftChanges, gitHistory, commits]);

  // 解析当前 Diff 的结构化行
  const parsedLines = useMemo(() => {
    if (!currentDiffData?.diffText) return [];
    return parseUnifiedDiff(currentDiffData.diffText);
  }, [currentDiffData?.diffText]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSha(id);
    setTimeout(() => setCopiedSha(null), 2000);
    toast.success('Commit SHA 已复制');
  };

  return (
    <div className="space-y-4">
      {/* 1. 顶栏：文件路径与刷新状态 */}
      <div className="flex items-center justify-between bg-slate-50 border border-slate-200/80 p-2.5 rounded-xl text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <FileCode2 className="w-4 h-4 text-indigo-600 shrink-0" />
          <span className="font-mono text-slate-700 font-semibold truncate" title={filePath}>
            {filePath}
          </span>
          <span className="text-slate-400 font-normal shrink-0">
            ({commits.length} 次版本提交)
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              title="刷新 Git 变更历史"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* 2. 变更版本时间轴选择栏 (Horizontal Pills) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
        {/* 编辑器草稿药丸 (若有未保存修改) */}
        {hasDraftChanges && (
          <button
            onClick={() => setSelectedTarget('draft')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold shrink-0 transition-all cursor-pointer ${
              selectedTarget === 'draft'
                ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-2xs'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 animate-pulse" />
            <span>在线草稿未保存变动</span>
          </button>
        )}

        {/* 本地工作区未提交药丸 */}
        {gitHistory?.hasWorkingTreeChanges && (
          <button
            onClick={() => setSelectedTarget('working-tree')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold shrink-0 transition-all cursor-pointer ${
              selectedTarget === 'working-tree'
                ? 'bg-rose-50 border-rose-300 text-rose-900 shadow-2xs'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
            <span>工作区未提交变动</span>
          </button>
        )}

        {/* Commit 历史列表 */}
        {commits.map((c, idx) => {
          const isSelected =
            selectedTarget === c.hash ||
            (selectedTarget === 'HEAD' && idx === 0 && !hasDraftChanges && !gitHistory?.hasWorkingTreeChanges);

          return (
            <button
              key={c.hash}
              onClick={() => setSelectedTarget(c.hash)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs shrink-0 transition-all cursor-pointer ${
                isSelected
                  ? 'bg-blue-50 border-blue-300 text-blue-900 font-semibold shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <GitCommit className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
              <span className="font-mono text-[11px] font-bold">{c.shortHash}</span>
              <span className="max-w-[160px] truncate text-[11px] font-normal" title={c.message}>
                {c.message}
              </span>
              <div className="flex items-center gap-1 text-[10px] font-mono shrink-0">
                {c.linesAdded > 0 && <span className="text-emerald-600">+{c.linesAdded}</span>}
                {c.linesDel > 0 && <span className="text-rose-600">-{c.linesDel}</span>}
              </div>
            </button>
          );
        })}
      </div>

      {/* 3. 选中版本的元数据卡片 (Header Card) */}
      {currentDiffData && (
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80">
                  {currentDiffData.shortHash}
                </span>
                <span className="text-xs font-bold text-slate-900 truncate">
                  {currentDiffData.message}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-400" />
                  <span>{currentDiffData.author}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>{currentDiffData.date}</span>
                </span>
              </div>
            </div>

            {currentDiffData.hash !== 'DRAFT' && currentDiffData.hash !== 'UNCOMMITTED' && (
              <button
                onClick={() => copyToClipboard(currentDiffData.hash, currentDiffData.hash)}
                className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded text-[10px] flex items-center gap-1 transition-colors border border-slate-200/60 shrink-0 cursor-pointer"
              >
                {copiedSha === currentDiffData.hash ? (
                  <Check className="w-3 h-3 text-emerald-500" />
                ) : (
                  <Copy className="w-3 h-3 text-slate-400" />
                )}
                <span>复制完整 SHA</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4. Git Diff 差异渲染面板 (GitHub/VSCode Dark Theme) */}
      <div className="rounded-xl bg-[#0B101B] border border-slate-800 overflow-hidden shadow-lg font-mono text-xs">
        {/* 顶栏信息 */}
        <div className="h-9 px-4 bg-[#141A29] border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <GitCompare className="w-3.5 h-3.5 text-indigo-400" />
            <span>Git Unified Diff</span>
            <span className="text-slate-500">({filePath})</span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[10px]">
            {currentDiffData && (
              <>
                <span className="text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
                  +{currentDiffData.linesAdded} lines
                </span>
                <span className="text-rose-400 bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-800/40">
                  -{currentDiffData.linesDel} lines
                </span>
              </>
            )}
          </div>
        </div>

        {/* 差异代码体 */}
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto divide-y divide-slate-800/40">
          {parsedLines.length > 0 ? (
            parsedLines.map((line, idx) => {
              if (line.type === 'header') {
                return (
                  <div key={idx} className="px-4 py-0.5 text-slate-500 text-[10px] bg-[#0E1524] select-none font-mono">
                    {line.content}
                  </div>
                );
              }

              if (line.type === 'chunk') {
                return (
                  <div
                    key={idx}
                    className="px-4 py-1 text-indigo-400 font-semibold text-[11px] bg-indigo-950/30 border-y border-indigo-900/30 select-none font-mono flex items-center gap-2"
                  >
                    <span className="text-indigo-500">@@</span>
                    <span>{line.content.replace(/^@@\s*/, '')}</span>
                  </div>
                );
              }

              if (line.type === 'add') {
                return (
                  <div
                    key={idx}
                    className="flex items-start text-emerald-300 bg-emerald-950/25 hover:bg-emerald-950/40 transition-colors border-l-2 border-emerald-500"
                  >
                    <span className="w-10 text-right pr-2 text-emerald-700/60 select-none text-[10px] shrink-0 font-mono pt-0.5">
                      {line.newLine || ''}
                    </span>
                    <span className="w-5 text-center text-emerald-400 select-none font-bold shrink-0 pt-0.5">
                      +
                    </span>
                    <pre className="flex-1 py-0.5 pr-4 overflow-x-auto font-mono text-xs leading-5">
                      {line.content}
                    </pre>
                  </div>
                );
              }

              if (line.type === 'del') {
                return (
                  <div
                    key={idx}
                    className="flex items-start text-rose-300 bg-rose-950/25 hover:bg-rose-950/40 transition-colors border-l-2 border-rose-500"
                  >
                    <span className="w-10 text-right pr-2 text-rose-700/60 select-none text-[10px] shrink-0 font-mono pt-0.5">
                      {line.oldLine || ''}
                    </span>
                    <span className="w-5 text-center text-rose-400 select-none font-bold shrink-0 pt-0.5">
                      -
                    </span>
                    <pre className="flex-1 py-0.5 pr-4 overflow-x-auto font-mono text-xs leading-5">
                      {line.content}
                    </pre>
                  </div>
                );
              }

              return (
                <div
                  key={idx}
                  className="flex items-start text-slate-300 hover:bg-slate-800/30 transition-colors"
                >
                  <span className="w-10 text-right pr-2 text-slate-600 select-none text-[10px] shrink-0 font-mono pt-0.5">
                    {line.newLine || line.oldLine || ''}
                  </span>
                  <span className="w-5 text-center text-slate-700 select-none shrink-0 pt-0.5">
                    &nbsp;
                  </span>
                  <pre className="flex-1 py-0.5 pr-4 overflow-x-auto font-mono text-xs leading-5">
                    {line.content}
                  </pre>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-slate-500 space-y-2">
              <History className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs">
                {loading
                  ? '正在加载 Git 变更历史与 Diff 差异...'
                  : selectedTarget === 'draft'
                  ? '当前草稿已与代码库保持同步，无未保存变动'
                  : '该版本与基线完全一致，未产生差异代码'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
