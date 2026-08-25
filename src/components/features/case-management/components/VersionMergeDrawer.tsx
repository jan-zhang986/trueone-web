import { useState, useEffect, useCallback } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { projectManagementService, caseManagementService } from '@/services';
import { toast } from 'sonner';
import { GitMerge, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface VersionMergeDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  availableBranches?: string[];
  onSuccess?: () => void;
}

export function VersionMergeDrawer({ open, onOpenChange, projectId, availableBranches, onSuccess }: VersionMergeDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [versions, setVersions] = useState<any[]>([]);
  const [sourceVersionId, setSourceVersionId] = useState<string>('');
  const [targetVersionId, setTargetVersionId] = useState<string>('master');

  const fetchVersions = useCallback(async () => {
    if (!projectId) return;
    try {
      const res: any = await projectManagementService.getVersionOptions(projectId);
      const fetched = Array.isArray(res) && res.length > 0 ? res : [];
      if (fetched.length > 0) {
        setVersions(fetched);
      } else {
        const branchList = availableBranches && availableBranches.length > 0
          ? availableBranches
          : ['master'];
        setVersions(branchList.map((b) => ({ id: b, name: b === 'master' ? 'master (主干分支)' : b })));
      }
    } catch (error) {
      console.warn('Failed to fetch versions, using available branches fallback', error);
      const branchList = availableBranches && availableBranches.length > 0
        ? availableBranches
        : ['master'];
      setVersions(branchList.map((b) => ({ id: b, name: b === 'master' ? 'master (主干分支)' : b })));
    }
  }, [projectId, availableBranches]);

  useEffect(() => {
    if (open) {
      fetchVersions();
    }
  }, [open, fetchVersions]);

  const handleMerge = async () => {
    if (!sourceVersionId || !targetVersionId) {
      toast.error('请选择源版本和目标版本');
      return;
    }
    if (sourceVersionId === targetVersionId) {
      toast.error('源版本和目标版本不能相同');
      return;
    }

    setLoading(true);
    try {
      await caseManagementService.mergeCaseVersion({
        projectId,
        sourceVersionId,
        targetVersionId,
      });
      toast.success('版本合并成功');
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Merge failed', error);
      toast.error(error?.message || '版本合并失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="h-full w-[450px] ml-auto">
        <DrawerHeader className="border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50">
              <GitMerge className="h-4 w-4 text-blue-600" />
            </div>
            <DrawerTitle className="text-lg font-semibold">合并用例版本</DrawerTitle>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
          <Alert variant="default" className="bg-blue-50 border-blue-100 text-blue-800">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-sm font-semibold">什么是版本合并？</AlertTitle>
            <AlertDescription className="text-xs mt-1 leading-relaxed">
              版本合并将把「源版本」中的功能用例（包括名称、步骤、预期结果及绑定的自动化）同步到「目标版本」。
              <br />
              <span className="font-medium">注意：这将覆盖目标版本中 refId 相同的用例。</span>
            </AlertDescription>
          </Alert>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">源版本 (Source)</Label>
              <Select value={sourceVersionId} onValueChange={setSourceVersionId}>
                <SelectTrigger>
                  <SelectValue placeholder="选择作为来源的版本" />
                </SelectTrigger>
                <SelectContent>
                  {versions.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name} {v.latest && <span className="ml-1 text-[10px] text-blue-500 font-normal">(Latest)</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-gray-400">将从此版本提取最新的用例定义</p>
            </div>

            <div className="flex justify-center">
              <div className="h-8 w-px bg-gray-100 relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-1">
                  <GitMerge className="h-3 w-3 text-gray-300" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">目标版本 (Target)</Label>
              <Select value={targetVersionId} onValueChange={setTargetVersionId}>
                <SelectTrigger>
                  <SelectValue placeholder="选择要合并到的版本" />
                </SelectTrigger>
                <SelectContent>
                  {versions.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name} {v.latest && <span className="ml-1 text-[10px] text-blue-500 font-normal">(Latest)</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-gray-400">合并后，此版本的用例将更新为与源版本一致</p>
            </div>
          </div>

          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/50 p-4 space-y-3">
            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">合并选项</Label>
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              <span className="text-sm text-gray-600">同步自动化绑定</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              <span className="text-sm text-gray-600">同步自定义字段（优先级、版本等）</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              <span className="text-sm text-gray-600">同步附件（图片、文档引用）</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              <span className="text-sm text-gray-600">同步文本描述与测试步骤</span>
            </div>
          </div>
        </div>

        <DrawerFooter className="border-t p-6 bg-gray-50/30">
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              取消
            </Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700" 
              onClick={handleMerge} 
              disabled={loading || !sourceVersionId || !targetVersionId || sourceVersionId === targetVersionId}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              开始合并
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
