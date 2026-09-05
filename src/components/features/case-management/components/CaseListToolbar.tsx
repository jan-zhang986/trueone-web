/**
 * 用例主视图工具栏
 * 围绕统一 Case 资产操作，realization 在用例详情内管理
 */

import { Search, RefreshCw, Plus, Upload, List, Network, Filter, X, Columns3, GitMerge, Sparkles, GitBranch, Loader2, FolderGit2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { CaseViewSelect } from './CaseViewSelect';
import { ProjectVersionSelect } from './ProjectVersionSelect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';

export interface CaseListToolbarProps {
  searchInput: string;
  searchKeyword: string;
  loading: boolean;
  showType: 'repo' | 'list' | 'minder';
  viewId?: string;
  customViews?: { id: string; name: string }[];
  hasActiveFilter?: boolean;
  onSearchInputChange: (value: string) => void;
  onSearch: () => void;
  onClearSearch: () => void;
  onRefresh: () => void;
  onShowTypeChange: (type: 'repo' | 'list' | 'minder') => void;
  onViewChange?: (id: string) => void;
  onFilterClick?: () => void;
  onClearFilter?: () => void;
  onCreateCase?: () => void;
  onImportOpen: () => void;
  onColumnSettingsClick?: () => void;
  onAiGenerate?: () => void;
  projectId: string;
  showVersionControls?: boolean;
  versionId?: string;
  onVersionChange?: (id: string) => void;
  onVersionSelect?: (version: any) => void;
  onMergeClick?: () => void;
}

export function CaseListToolbar({
  searchInput,
  searchKeyword,
  loading,
  showType,
  viewId = 'all_data',
  customViews = [],
  hasActiveFilter = false,
  onSearchInputChange,
  onSearch,
  onClearSearch,
  onRefresh,
  onShowTypeChange,
  onViewChange,
  onFilterClick,
  onClearFilter,
  onCreateCase,
  onImportOpen,
  onColumnSettingsClick,
  onAiGenerate,
  projectId,
  showVersionControls = true,
  versionId,
  onVersionChange,
  onVersionSelect,
  onMergeClick,
}: CaseListToolbarProps) {
  // 大屏正常尺寸，小屏随视口等比例缩小；整条占满容器宽，搜索区可收缩，保证右侧按钮不被裁切
  const barCls = 'flex items-center justify-between border-b border-gray-100 flex-shrink-0 w-full min-w-0 text-sm font-medium text-gray-700';
  const tabCls =
    'data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center';
  const btnCls = 'border-gray-200 text-sm font-medium';
  const iconCls = 'shrink-0';

  return (
    <div
      className="flex items-center justify-between border-b border-gray-200/60 bg-white/50 backdrop-blur-md sticky top-0 z-20 w-full shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-2 px-4 gap-3 flex-wrap lg:flex-nowrap"
    >
      {/* Left: Action Group */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          size="sm"
          className="bg-[#165DFF] hover:bg-[#165DFF]/90 text-white shadow-sm transition-all active:scale-95 h-8"
          onClick={onCreateCase}
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          新建
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="border-gray-200 text-gray-700 bg-white hover:bg-gray-50 h-8 px-2.5"
          onClick={onImportOpen}
        >
          <Upload className="w-3.5 h-3.5 mr-1" />
          导入
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="border-violet-200 text-violet-700 bg-violet-50/30 hover:bg-violet-50 h-8 px-2.5"
          onClick={onAiGenerate || (() => toast.info('AI 生成功能正在开发中，敬请期待'))}
        >
          <Sparkles className="w-3.5 h-3.5 mr-1 text-violet-500" />
          AI 生成
        </Button>
      </div>

      {/* Right: Context & Utility Group */}
      <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
        {showVersionControls && (
          <>
            <div className="h-4 w-px bg-gray-200 mx-1 flex-shrink-0" />

            <ProjectVersionSelect
              projectId={projectId}
              value={versionId ?? ''}
              onValueChange={onVersionChange ?? (() => {})}
              onSelect={onVersionSelect}
            />

            <Button
              variant="ghost"
              size="sm"
              className="text-indigo-600 hover:bg-indigo-50 h-8 px-2 gap-1 font-medium flex-shrink-0"
              onClick={onMergeClick}
            >
              <GitMerge className="w-3.5 h-3.5" />
              合并
            </Button>

            <div className="h-4 w-px bg-gray-200 mx-1 flex-shrink-0" />
          </>
        )}

        <div className="relative w-full max-w-[240px] flex-shrink">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <Input
            value={searchInput}
            onChange={(e) => onSearchInputChange(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && onSearch()}
            placeholder="搜索 ID / 名称..."
            className="pl-8 pr-8 h-8 text-xs border-gray-200 bg-gray-50/50 focus-visible:ring-1 focus-visible:ring-[#165DFF] transition-all"
          />
          {searchInput && (
            <button
              type="button"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              onClick={onClearSearch}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <CaseViewSelect
          value={viewId}
          customViews={customViews}
          onValueChange={(id) => onViewChange?.(id)}
          onNewView={onFilterClick}
        />

        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 px-2.5 gap-1.5 transition-all text-xs",
            hasActiveFilter 
              ? "bg-blue-50 border-blue-200 text-blue-600" 
              : "bg-white border-gray-200 text-gray-600"
          )}
          onClick={onFilterClick}
        >
          <Filter className={cn("w-3.5 h-3.5", hasActiveFilter ? "text-blue-500" : "text-gray-400")} />
          筛选
        </Button>

        <Tabs
          value={showType}
          onValueChange={(v) => v && onShowTypeChange(v as 'repo' | 'list' | 'minder')}
          className="bg-gray-100/80 p-0.5 rounded-md border border-gray-200/50"
        >
          <TabsList className="bg-transparent h-7 p-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger value="repo" className="h-6 px-2 text-[11px] font-medium gap-1 data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:font-semibold data-[state=active]:shadow-xs">
                    <FolderGit2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>代码大仓</span>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent>代码大仓工程视图 (Repo Explorer)</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger value="list" className="h-6 w-7 p-0 data-[state=active]:bg-white data-[state=active]:shadow-xs">
                    <List className="w-3.5 h-3.5" />
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent>传统表格大盘</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger value="minder" className="h-6 w-7 p-0 data-[state=active]:bg-white data-[state=active]:shadow-xs">
                    <Network className="w-3.5 h-3.5" />
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent>思维导图视图</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </TabsList>
        </Tabs>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 text-gray-400 border-gray-200"
                onClick={onRefresh}
                disabled={loading}
              >
                <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>刷新</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
