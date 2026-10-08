import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { qualityWorkspaceService } from '@/services';
import { LivingTestPlanMatrixView } from '@/components/features/test-plan/LivingTestPlanMatrixView';
import { Loader2, Layers3 } from 'lucide-react';

interface QualityWorkspaceDetail {
  id: string;
  num?: string;
  name: string;
  status?: string;
  projectId?: string;
  goal?: string;
  description?: string;
  createdAt?: number;
}

function getWorkspaceIdFromPathname(pathname: string): string {
  const segments = pathname.replace(/\/+$/, '').split('/').filter(Boolean);
  if (segments[0] !== 'quality-workspace' && segments[0] !== 'test-plan') return '';
  const last = segments[segments.length - 1];
  return last === 'config-report' ? '' : last;
}

export function QualityWorkspaceDetailPage() {
  const { planId: legacyPlanIdParam, workspaceId: workspaceIdParam } = useParams<{ planId?: string; workspaceId?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const workspaceId = workspaceIdParam || legacyPlanIdParam || getWorkspaceIdFromPathname(location.pathname) || 'PLAN-2026-PAY-0928';

  const [detail, setDetail] = useState<QualityWorkspaceDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDetail = useCallback(async (id: string) => {
    if (!id || id === 'quality-workspace' || id === 'test-plan') return;
    setLoading(true);
    try {
      const res = await qualityWorkspaceService.getWorkspaceDetail(id).catch(() => null);
      const data = (res as any)?.data || res;
      if (data && typeof data === 'object') {
        setDetail({
          id: data.workspaceId || data.id || id,
          name: data.name || data.title || '2026-Q3 聚合支付与退款系统状态机重构',
          status: data.status || 'IN_PROGRESS',
          projectId: data.projectId,
          description: data.description,
        });
      } else {
        setDetail({
          id,
          name: '2026-Q3 聚合支付与退款系统状态机重构',
          status: 'IN_PROGRESS',
        });
      }
    } catch {
      setDetail({
        id,
        name: '2026-Q3 聚合支付与退款系统状态机重构',
        status: 'IN_PROGRESS',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDetail(workspaceId);
  }, [workspaceId, fetchDetail]);

  const handleBack = () => {
    navigate('/quality-workspace?menu=quality-workspace&tab=workspace');
  };

  if (loading && !detail) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#fafafa]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          <span className="text-xs font-mono text-slate-400">正在载入测试计划差分对账视窗...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-hidden bg-[#fafafa]">
      <LivingTestPlanMatrixView
        planName={detail?.name || '2026-Q3 聚合支付与退款系统状态机重构'}
        planId={workspaceId}
        onBack={handleBack}
      />
    </div>
  );
}

export const TestPlanDetailPage = QualityWorkspaceDetailPage;
