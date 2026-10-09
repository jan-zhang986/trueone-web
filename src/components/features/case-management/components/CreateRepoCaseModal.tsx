import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Network, FileCode2, Sparkles, Loader2, GitBranch } from 'lucide-react';
import { toast } from 'sonner';
import { repoCaseService, UnifiedTestCase } from '@/services/case-management/service-repo-case';

interface CreateRepoCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  repoId: string;
  currentBranch: string;
  onSuccess: (newCase: UnifiedTestCase) => void;
}

export const CreateRepoCaseModal: React.FC<CreateRepoCaseModalProps> = ({
  isOpen,
  onClose,
  repoId,
  currentBranch,
  onSuccess,
}) => {
  const [title, setTitle] = useState('');
  const [filePath, setFilePath] = useState('');
  const [module, setModule] = useState('交易履约引擎');
  const [priority, setPriority] = useState<'P0' | 'P1' | 'P2'>('P1');
  const [caseType, setCaseType] = useState<'yaml' | 'code'>('yaml');
  const [submitting, setSubmitting] = useState(false);

  // 根据标题自动推导建议文件名
  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!filePath || filePath.startsWith('workflows/')) {
      const slug = val
        .trim()
        .toLowerCase()
        .replace(/[\s\-_]+/g, '_')
        .replace(/[^\w\u4e00-\u9fa5]/g, '');
      const defaultName = slug ? `workflows/${slug}.workflow.yaml` : 'workflows/new_case.workflow.yaml';
      setFilePath(defaultName);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('请输入用例标题');
      return;
    }
    if (!filePath.trim()) {
      toast.error('请输入有效的文件路径');
      return;
    }

    setSubmitting(true);
    try {
      const res: any = await repoCaseService.createCase(repoId, {
        branch: currentBranch || 'main',
        filePath: filePath.trim(),
        title: title.trim(),
        module: module.trim() || 'default',
        priority,
        type: caseType,
      });

      toast.success(res?.message || '新建用例成功！');
      onSuccess(res?.case || res?.data?.case);
      onClose();
      // 重置表单
      setTitle('');
      setFilePath('');
    } catch (err: any) {
      toast.error(`创建用例失败: ${err?.message || err}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md sm:max-w-lg bg-white p-6 rounded-xl shadow-2xl">
        <DialogHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  新建测试用例 (Test as Code)
                </DialogTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  在当前代码分支直接生成用例，自动载入黄金 DAG 编排模版
                </p>
              </div>
            </div>
            <Badge variant="outline" className="flex items-center gap-1 font-mono text-xs text-slate-600 bg-slate-50">
              <GitBranch className="w-3 h-3 text-slate-500" />
              {currentBranch || 'main'}
            </Badge>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-3">
          {/* 用例类型选择 */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">用例类型</Label>
            <div className="grid grid-cols-2 gap-3">
              <div
                onClick={() => setCaseType('yaml')}
                className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-2.5 ${
                  caseType === 'yaml'
                    ? 'border-blue-600 bg-blue-50/40 shadow-2xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <Network className={`w-4 h-4 mt-0.5 shrink-0 ${caseType === 'yaml' ? 'text-blue-600' : 'text-slate-400'}`} />
                <div>
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    DAG 工作流
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1 py-0.2 rounded font-normal">推荐</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    基于 YAML 编排，支持 API+DB 数据核验与门禁
                  </div>
                </div>
              </div>

              <div
                onClick={() => setCaseType('code')}
                className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-2.5 ${
                  caseType === 'code'
                    ? 'border-blue-600 bg-blue-50/40 shadow-2xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <FileCode2 className={`w-4 h-4 mt-0.5 shrink-0 ${caseType === 'code' ? 'text-blue-600' : 'text-slate-400'}`} />
                <div>
                  <div className="text-xs font-bold text-slate-800">常规代码用例</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    基于 Python / Go 原生测试代码文件
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 用例标题 */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">
              用例标题 <span className="text-rose-500">*</span>
            </Label>
            <Input
              placeholder="例如: 模拟用户秒杀下单与数据库账本核销"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="text-xs h-9"
              autoFocus
            />
          </div>

          {/* 存储路径 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-slate-700">
                文件路径 <span className="text-rose-500">*</span>
              </Label>
              <span className="text-[11px] text-slate-400">将创建在当前仓库分支</span>
            </div>
            <Input
              placeholder="workflows/order_reconcile.workflow.yaml"
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              className="text-xs font-mono h-9 bg-slate-50/60"
            />
          </div>

          {/* 模块与优先级 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">所属模块</Label>
              <Input
                placeholder="业务交易引擎"
                value={module}
                onChange={(e) => setModule(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">优先级</Label>
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 h-9">
                {(['P0', 'P1', 'P2'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`flex-1 py-1 rounded-md text-xs font-medium transition-all ${
                      priority === p
                        ? 'bg-white text-slate-900 font-bold shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2 border-t border-slate-100 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
              className="text-xs h-8.5 px-4"
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={submitting || !title.trim()}
              className="text-xs h-8.5 px-4 bg-blue-600 hover:bg-blue-700 text-white shadow-xs font-medium"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  正在创建并提交...
                </>
              ) : (
                '立即创建用例'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
