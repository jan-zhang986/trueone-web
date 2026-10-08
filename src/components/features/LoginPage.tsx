import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Shield,
  Zap,
  Sparkles,
  ArrowRight,
  Check,
  Loader2,
  Globe,
  Database,
  User,
  Lock,
  Eye,
  EyeOff,
  Workflow,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUser } from '@/contexts/UserContext';
import { authService } from '@/services/auth';
import { getToken as getAuthToken, hasToken } from '@/utils/auth';
import { toast } from 'sonner';

export function LoginPage() {
  const { handleLoginSuccess, isAuthenticated } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingCallback, setIsProcessingCallback] = useState(false);

  // 账号密码登录状态
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'feishu' | 'password'>('feishu');

  // 解析 redirect 参数，提取实际的路径（忽略回调参数）
  const parseRedirectPath = (redirectParam: string | null): string => {
    if (!redirectParam || redirectParam.trim() === '') {
      return '/';
    }

    try {
      const decoded = decodeURIComponent(redirectParam.trim());
      
      // 如果解码后为空或者是根路径，返回默认路径（欢迎页）
      if (decoded === '/' || decoded === '' || decoded.trim() === '') {
        return '/';
      }
      
      // 如果包含查询参数，只取路径部分
      if (decoded.includes('?')) {
        const pathPart = decoded.split('?')[0].trim();
        return pathPart === '/' || pathPart === '' ? '/' : pathPart;
      }
      
      // 确保路径以 / 开头
      const path = decoded.startsWith('/') ? decoded : `/${decoded}`;
      return path === '/' ? '/' : path;
    } catch (e) {
      console.warn('[LoginPage] 解析 redirect 参数失败:', e, redirectParam);
      return '/';
    }
  };

  // 如果已经登录，自动跳转到目标页面或首页
  // 注意：只有在明确认证成功时才跳转，避免因为过期 token 导致无法访问登录页
  useEffect(() => {
    // 只有在明确认证成功时才跳转（isAuthenticated 为 true）
    // 如果只有 token 但没有认证状态，可能是过期 token，允许用户重新登录
    if (isAuthenticated) {
      const searchParams = new URLSearchParams(location.search);
      const redirectParam = searchParams.get('redirect') || (location.state as any)?.from?.pathname || null;
      // 使用 parseRedirectPath 处理 redirect 参数，确保路径有效
      const redirect = parseRedirectPath(redirectParam);
      // 使用 setTimeout 确保在下一个事件循环中执行，避免在渲染期间导航
      const timer = setTimeout(() => {
        navigate(redirect, { replace: true });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, location, navigate]);

  // 处理飞书回调
  useEffect(() => {
    let isMounted = true; // 标记组件是否已挂载
    
    const processCallback = async () => {
      if (typeof window === 'undefined') return;
      
      // 检查 handleLoginSuccess 是否存在
      if (!handleLoginSuccess) {
        console.warn('[LoginPage] handleLoginSuccess is not available');
        return;
      }

      // 检查是否已经在处理回调（防止重复处理）
      if ((window as any).__feishuCallbackProcessing) {
        return;
      }

      // 检查 URL 参数中是否有 sessionId（来自后端回调重定向）
      // 这是主要的飞书登录流程：后端处理回调后重定向回来
      // 注意：后端可能重定向到 hash 路由格式（/#/login），需要转换为标准路由格式（/login）
      let urlParams: URLSearchParams;
      let sessionId: string | null = null;
      let success: string | null = null;
      let source: string | null = null;
      let code: string | null = null;
      let state: string | null = null;

      // 检查是否是 hash 路由格式（后端可能重定向到 /#/login?xxx）
      // 后端硬编码了重定向URL为 http://aegis.tst.spotter.ink/#/login，需要转换为标准路由格式
      if (window.location.hash && window.location.hash.includes('login')) {

        // 从 hash 中提取参数（支持多种格式：/#/login?xxx 或 #/login?xxx）
        const hashMatch = window.location.hash.match(/\/?login\?([^#]+)/);
        if (hashMatch) {
          urlParams = new URLSearchParams(hashMatch[1]);
          sessionId = urlParams.get('sessionId');
          success = urlParams.get('success');
          source = urlParams.get('source');
          code = urlParams.get('code');
          state = urlParams.get('state');

          // 如果是 hash 路由格式，立即清除 hash 并重定向到标准路由
          const queryString = hashMatch[1];
          const cleanUrl = window.location.origin + '/login' + (queryString ? '?' + queryString : '');
          window.history.replaceState({}, document.title, cleanUrl);

          // 重新从标准路由的查询参数中读取（因为已经转换了）
          urlParams = new URLSearchParams(window.location.search);
          sessionId = urlParams.get('sessionId');
          success = urlParams.get('success');
          source = urlParams.get('source');
          code = urlParams.get('code');
          state = urlParams.get('state');
        } else {
          // hash 中没有参数，使用标准查询参数
          urlParams = new URLSearchParams(window.location.search);
          sessionId = urlParams.get('sessionId');
          success = urlParams.get('success');
          source = urlParams.get('source');
          code = urlParams.get('code');
          state = urlParams.get('state');
        }
      } else {
        // 标准路由格式
        urlParams = new URLSearchParams(window.location.search);
        sessionId = urlParams.get('sessionId');
        success = urlParams.get('success');
        source = urlParams.get('source');
        code = urlParams.get('code');
        state = urlParams.get('state');

        // 如果直接参数中没有回调信息，检查 redirect 参数中是否包含回调参数
        // 后端可能将回调参数编码在 redirect 参数中（如：redirect=/?success=true&source=lark&sessionId=xxx）
        if (!sessionId && !success && !source) {
          const redirectParam = urlParams.get('redirect');
          if (redirectParam) {
            try {
              // 解码 redirect 参数
              const decodedRedirect = decodeURIComponent(redirectParam);
              // 如果 redirect 是完整的 URL，提取查询参数部分
              let redirectQueryString = decodedRedirect;
              if (decodedRedirect.includes('?')) {
                redirectQueryString = decodedRedirect.split('?')[1];
              }
              // 解析 redirect 中的查询参数
              const redirectParams = new URLSearchParams(redirectQueryString);
              sessionId = redirectParams.get('sessionId') || sessionId;
              success = redirectParams.get('success') || success;
              source = redirectParams.get('source') || source;
              code = redirectParams.get('code') || code;
              state = redirectParams.get('state') || state;
            } catch (e) {
              console.warn('解析 redirect 参数失败:', e);
            }
          }
        }
      }

      // 主要流程：后端处理后的重定向（success=true&source=lark&sessionId=...）
      if (success === 'true' && source === 'lark' && sessionId) {
        (window as any).__feishuCallbackProcessing = true;
        if (isMounted) {
          setIsProcessingCallback(true);
        }

        try {
          // 验证 sessionId 格式（UUID）
          const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          const cleanSessionId = String(sessionId).trim();

          if (!uuidPattern.test(cleanSessionId)) {
            throw new Error('无效的 sessionId 格式');
          }

          // 清空旧状态
          const { clearToken } = await import('@/utils/auth');
          clearToken();

          // 先通过 /lark/user 接口获取用户信息（包含 csrfToken），这个接口不需要 CSRF token
          let csrfToken = '';
          try {
            const userInfo = await authService.getLarkUserBySessionId(cleanSessionId);
            if (userInfo && (userInfo as any).csrfToken) {
              csrfToken = (userInfo as any).csrfToken;
            }
          } catch (error) {
            console.warn('[LoginPage] 通过 /lark/user 获取用户信息失败，将尝试其他方式:', error);
            // 如果失败，继续使用空 csrfToken，handleLoginSuccess 会尝试从 getCurrentUser 获取
          }

          // 保存新的 token（包含 csrfToken）
          await handleLoginSuccess(cleanSessionId, csrfToken);

          // 验证 token 是否已保存
          const tokenPair = getAuthToken();
          if (!tokenPair?.sessionId || tokenPair.sessionId !== cleanSessionId) {
            throw new Error('Token 保存失败');
          }

          if (isMounted) {
            toast.success('飞书登录成功!');

            // 立即跳转到测试工厂页面，使用 replace 避免在历史记录中留下回调地址
            const searchParams = new URLSearchParams(location.search);
            const redirectParam = searchParams.get('redirect');
            const redirect = parseRedirectPath(redirectParam) || (location.state as any)?.from?.pathname || '/test-factory';
            // 使用 replace 跳转，避免在历史记录中留下回调地址
            navigate(redirect, { replace: true });
          }
        } catch (error) {
          if (isMounted) {
            toast.error('登录状态保存失败，请重试');
            setIsProcessingCallback(false);
          }
          delete (window as any).__feishuCallbackProcessing;
        }
        return;
      }

      // 备用流程：直接来自飞书的回调（code + state），前端调用后端接口
      // 支持两种 state 格式：fit2cloud-lark-quick（原格式）和 fit2cloud-lark-quick-keeper-one-web（新格式）
      if (code && state && (state === 'fit2cloud-lark-quick' || state.startsWith('fit2cloud-lark-quick'))) {
        (window as any).__feishuCallbackProcessing = true;
        if (isMounted) {
          setIsProcessingCallback(true);
        }

        try {
          const codeStr = Array.isArray(code) ? code[0] : code;
          if (!codeStr) {
            throw new Error('授权码不能为空');
          }

          // 使用重试机制调用后端登录接口
          const tryLogin = async (attempt: number): Promise<any> => {
            if (!isMounted) {
              throw new Error('Component unmounted');
            }
            try {
              const authRes = await authService.larkLogin(codeStr);
              if (authRes.code === 200 && authRes.data?.sessionId) {
                return authRes.data;
              }
              throw new Error(authRes.message || '登录失败');
            } catch (err: any) {
              if (attempt < 3 && isMounted) {
                const delay = 1000 * attempt;
                await new Promise(resolve => setTimeout(resolve, delay));
                return tryLogin(attempt + 1);
              }
              throw err;
            }
          };

          const larkCallback = await tryLogin(1);

          if (!larkCallback || !larkCallback.sessionId) {
            throw new Error('无法获取登录信息，请重试');
          }

          await handleLoginSuccess(larkCallback.sessionId, larkCallback.csrfToken || '');

          if (isMounted) {
            toast.success('飞书登录成功!');

            // 立即跳转到测试工厂页面，使用 replace 避免在历史记录中留下回调地址
            const searchParams = new URLSearchParams(location.search);
            const redirectParam = searchParams.get('redirect');
            const redirect = parseRedirectPath(redirectParam) || (location.state as any)?.from?.pathname || '/test-factory';
            // 使用 replace 跳转，避免在历史记录中留下回调地址
            navigate(redirect, { replace: true });
          }
        } catch (error: any) {
          if (isMounted) {
            console.error('[LoginPage] 飞书登录失败:', error);
            toast.error(error?.message || '飞书登录失败，请重试');
            setIsProcessingCallback(false);

            // 清除 URL 参数
            const cleanUrl = window.location.origin + window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
          }
          delete (window as any).__feishuCallbackProcessing;
        }
        return;
      }
    };

    processCallback();
    
    // 清理函数：组件卸载时标记为未挂载
    return () => {
      isMounted = false;
    };
  }, [handleLoginSuccess, navigate, location]);

  // 账号密码登录处理
  const handlePasswordLogin = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (!username.trim()) {
      toast.error('请输入用户名');
      return;
    }

    if (!password.trim()) {
      toast.error('请输入密码');
      return;
    }

    setIsPasswordLoading(true);

    try {
      // 调用登录接口
      const response = await authService.login({
        username: username.trim(),
        password: password.trim(),
      });

      // AegisOne 登录成功返回 SessionUser 对象，包含 sessionId 和 csrfToken
      // 响应拦截器已经提取了 data.data，所以 response 就是 SessionUser 对象
      if (response) {
        const userData = response as any;

        // 直接从响应对象中提取（响应拦截器已经处理了 data.data）
        const sessionId = userData.sessionId;
        const csrfToken = userData.csrfToken || '';

        if (sessionId) {
          // 保存用户信息和 token
          await handleLoginSuccess(sessionId, csrfToken);

          // 验证 token 是否已保存到 localStorage
          const tokenPair = getAuthToken();
          if (!tokenPair?.sessionId) {
            // 直接保存到 localStorage
            const { setToken: setTokenUtil } = await import('@/utils/auth');
            setTokenUtil(sessionId, csrfToken);
            // 等待一下确保保存完成
            await new Promise(resolve => setTimeout(resolve, 50));
          }
          toast.success('登录成功!');

          // 清空表单
          setUsername('');
          setPassword('');

          // 等待状态更新和用户信息获取完成后再跳转
          await new Promise(resolve => setTimeout(resolve, 500));

          const finalToken = getAuthToken();
          if (finalToken?.sessionId) {
            const searchParams = new URLSearchParams(location.search);
            const redirectParam = searchParams.get('redirect') || (location.state as any)?.from?.pathname || null;
            // 使用 parseRedirectPath 处理 redirect 参数，确保路径有效
            const redirect = parseRedirectPath(redirectParam);
            // 直接 push 到目标页面，保留历史记录
            // App.tsx 中的回退保护会处理退出应用的情况
            navigate(redirect);
          } else {
            toast.error('登录状态保存失败，请重试');
          }
        } else {
          // 如果响应中没有 sessionId，可能是格式问题
          toast.error('登录响应格式异常，请重试');
        }
      } else {
        toast.error('登录失败，请检查用户名和密码');
      }
    } catch (error: any) {
      const errorMessage = error?.message || '登录失败，请检查用户名和密码';
      toast.error(errorMessage);
    } finally {
      setIsPasswordLoading(false);
    }
  };

  // 飞书快捷登录处理（与 aegis-next-server 保持一致）
  const handleFeishuLogin = async () => {
    if (isLoading) return;

    setIsLoading(true);

    try {
      // 获取飞书配置信息
      const larkInfo = await authService.getLarkInfo();

      if (!larkInfo.enable || !larkInfo.valid) {
        toast.error('飞书登录未启用或配置无效，请联系管理员');
        setIsLoading(false);
        return;
      }

      if (!larkInfo.agentId || !larkInfo.callBack) {
        toast.error('飞书配置无效，请联系管理员');
        setIsLoading(false);
        return;
      }

      // 构建飞书快捷登录URL（使用新的授权地址）
      // 在 state 参数中添加应用标识，用于区分不同的前端应用
      const redirectUri = larkInfo.callBack || 'http://aegis.tst.spotter.ink/devops/feishu/callback';
      // state 参数格式：fit2cloud-lark-quick-keeper-one-web（添加应用标识）
      const state = 'fit2cloud-lark-quick-keeper-one-web';
      const loginUrl = `https://accounts.feishu.cn/open-apis/authen/v1/authorize?client_id=${larkInfo.agentId
        }&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${encodeURIComponent(state)}`;


      // 直接跳转到飞书登录页面（后端会处理回调并重定向回来）
      window.location.href = loginUrl;
    } catch (error: any) {
      toast.error(error?.message || '获取飞书登录链接失败');
      setIsLoading(false);
    }
  };


  const features = [
    {
      icon: Workflow,
      title: '自动化流程编排',
      description: '可视化工作流设计',
    },
    {
      icon: FileText,
      title: '测试数据生成',
      description: '智能数据生成工具',
    },
    {
      icon: Zap,
      title: 'HTTP 接口',
      description: 'RESTful API 测试',
    },
    {
      icon: Database,
      title: 'SQL 数据库',
      description: '多数据库支持',
    },
    {
      icon: Globe,
      title: 'Dubbo 服务',
      description: 'RPC 服务调用',
    },
    {
      icon: Sparkles,
      title: 'RocketMQ',
      description: '消息队列测试',
    },
  ];

  const [greeting, setGreeting] = useState({ title: '', message: '' });


  useEffect(() => {
    const getGreeting = () => {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 12) {
        return {
          title: '上午好哇',
          message: '新的一天全新的开始，加油！'
        };
      } else if (hour >= 12 && hour < 14) {
        return {
          title: '中午好哇',
          message: '休息一下，补充能量吧！'
        };
      } else if (hour >= 14 && hour < 18) {
        return {
          title: '下午好哇',
          message: '保持专注，你真棒！'
        };
      } else if (hour >= 18 && hour < 23) {
        return {
          title: '晚上好哇',
          message: '今天辛苦了，快下班，享受夜晚的宁静吧。'
        };
      } else {
        return {
          title: '深夜好',
          message: '该休息了，身体是革命的本钱。'
        };
      }
    };
    setGreeting(getGreeting());
  }, []);

  // 如果正在处理回调，显示极客暗黑加载状态
  if (isProcessingCallback) {
    return (
      <div className="w-screen h-screen bg-[#050811] text-white flex items-center justify-center p-6 relative overflow-hidden font-sans select-none">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(110% 85% at 68% 28%, #14325c 0%, #0d1e38 32%, #081120 62%, #050811 100%)',
          }}
        />
        <div className="relative z-10 text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-blue-400 mx-auto" />
          <p className="text-lg font-medium text-white/90">正在处理安全授权回调...</p>
          <p className="text-sm text-white/50">请稍候，正在验证凭证建立会话</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#050811] text-white flex flex-col relative overflow-x-hidden select-none font-sans">
      {/* ================= 背景艺术层 (1:1 还原 DeepSeek 烟雾流动与深海蓝光) ================= */}
      {/* 径向深海蓝聚光 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(110% 85% at 68% 28%, #14325c 0%, #0d1e38 32%, #081120 62%, #050811 100%)',
        }}
      />

      {/* 微弱点阵坐标背景 (Dot Matrix Grid) */}
      <svg className="absolute inset-0 w-full h-full opacity-25 pointer-events-none">
        <defs>
          <pattern id="loginDotPattern" width="36" height="36" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#7fa8db" opacity="0.45" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#loginDotPattern)" />
      </svg>

      {/* 拟真三维高光流体烟雾波纹 (SVG Fluid Smoke Waves) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden mix-blend-screen opacity-60">
        <svg
          viewBox="0 0 1600 900"
          className="w-full h-full object-cover scale-110 -translate-y-6"
          preserveAspectRatio="none"
        >
          <defs>
            <filter id="loginSmokeBlur1" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="38" />
            </filter>
            <filter id="loginSmokeBlur2" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="65" />
            </filter>
            <linearGradient id="loginSmokeGrad1" x1="20%" y1="0%" x2="80%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
              <stop offset="25%" stopColor="#cfe3ff" stopOpacity="0.65" />
              <stop offset="60%" stopColor="#5b93e6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#1e3b6e" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="loginSmokeGrad2" x1="0%" y1="10%" x2="100%" y2="90%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
              <stop offset="40%" stopColor="#a8cdfc" stopOpacity="0.4" />
              <stop offset="70%" stopColor="#3b6eb8" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#08152e" stopOpacity="0" />
            </linearGradient>
          </defs>

          <path
            d="M 280 -60 C 260 220, 160 380, 240 540 C 310 680, 520 740, 680 820 C 820 890, 1100 920, 1400 960"
            fill="none"
            stroke="url(#loginSmokeGrad1)"
            strokeWidth="56"
            strokeLinecap="round"
            filter="url(#loginSmokeBlur1)"
          />
          <path
            d="M 1250 -40 C 1100 120, 880 180, 780 320 C 660 480, 860 620, 950 780 C 1020 900, 1150 940, 1380 980"
            fill="none"
            stroke="url(#loginSmokeGrad2)"
            strokeWidth="74"
            strokeLinecap="round"
            filter="url(#loginSmokeBlur2)"
          />
        </svg>
      </div>

      {/* ================= 顶部长廊导航栏 (1:1 风格) ================= */}
      <header className="w-full max-w-[1360px] mx-auto px-6 sm:px-12 h-20 sm:h-24 flex items-center justify-between relative z-20">
        {/* 左侧 Logo + 胶囊徽章 */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <img
            src="/trueone-logo-white.png?v=11"
            alt="TrueOne"
            className="h-11 sm:h-12 w-auto object-contain cursor-pointer transition-opacity hover:opacity-90 drop-shadow-[0_0_20px_rgba(56,189,248,0.2)]"
          />

          <div
            className="rounded-[9px] p-[1px] ml-1"
            style={{
              background:
                'linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.1) 40%, rgba(255,255,255,0.05) 60%, rgba(255,255,255,0.45) 100%)',
            }}
          >
            <div className="bg-[#0b101d]/90 backdrop-blur-md px-2.5 py-[3px] rounded-[8px]">
              <span className="font-mono text-[11px] font-medium tracking-wide text-white/90">Harness</span>
            </div>
          </div>
        </div>

        {/* 右侧：返回门户首页按钮 */}
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.12] text-white/85 hover:text-white text-xs font-medium transition-all backdrop-blur-md cursor-pointer"
        >
          <ArrowRight className="w-3.5 h-3.5 rotate-180" />
          <span>返回门户首页</span>
        </button>
      </header>

      {/* ================= 核心登录主视口 ================= */}
      <main className="flex-1 w-full max-w-[1360px] mx-auto px-6 sm:px-12 flex items-center justify-center relative z-20 pb-16">
        <div className="w-full grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-16 items-center">
          
          {/* 左侧说明区 (在桌面端展示，与门户页保持高度统一) */}
          <div className="hidden lg:flex flex-col items-start pr-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-400 text-xs font-medium mb-4 backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5" />
              <span>TrueOne Next · 智能测试工程中枢</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.15] mb-5 bg-gradient-to-br from-white via-white/95 to-white/70 bg-clip-text text-transparent">
              一切皆插件，<br />赋能极致效能。
            </h1>

            <p className="text-[15px] text-white/65 leading-[1.8] max-w-[500px] mb-8 font-normal">
              面向现代软件工程的企业级自动化测试生态。集成智能体编排、多协议接口与数据工厂，通过单点认证无缝融入敏捷团队。
            </p>

            {/* 核心特性胶囊卡片 */}
            <div className="grid grid-cols-2 gap-3.5 w-full max-w-[500px]">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="group rounded-xl border border-white/[0.08] bg-[#0c1424]/50 backdrop-blur-md p-3.5 hover:border-blue-400/30 hover:bg-[#0f1b33]/60 transition-all duration-200"
                >
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <feature.icon className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    <span className="text-sm font-semibold text-white/90">{feature.title}</span>
                  </div>
                  <p className="text-xs text-white/50 leading-relaxed pl-[38px]">{feature.description}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex items-center gap-2 text-xs text-white/45">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>时时寻求效率进步，事事讲求方法技术。</span>
            </div>
          </div>

          {/* 右侧微光毛玻璃登录卡片 (Linear / Apple 旗舰级暗黑极简质感) */}
          <div className="w-full max-w-[440px] mx-auto lg:ml-auto">
            <div className="relative rounded-3xl border border-white/[0.12] bg-[#0a101d]/80 backdrop-blur-2xl shadow-[0_30px_90px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,255,255,0.06)] p-7 sm:p-9 overflow-hidden">
              
              {/* 顶部极光微光掠线 (Ambient Top-Rim Light) */}
              <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-blue-400/50 to-transparent pointer-events-none" />
              <div className="absolute top-0 right-1/4 w-32 h-20 bg-blue-500/10 blur-2xl pointer-events-none" />

              {/* 标题与欢迎提示 */}
              <div className="mb-6">
                <div className="inline-block text-[11px] font-medium text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full mb-2.5">
                  {greeting.title} · {greeting.message}
                </div>
                <h3 className="text-2xl font-bold text-white tracking-tight">登录 TrueOne 平台</h3>
                <p className="text-xs text-white/50 mt-1.5">统一登录身份中心，快速开启高效测试</p>
              </div>

              {/* 内嵌式 iOS / Linear 风格分段选择器 (Segmented Switcher) */}
              <div className="p-1 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center mb-6">
                <button
                  type="button"
                  onClick={() => setLoginMethod('feishu')}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                    loginMethod === 'feishu'
                      ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/30'
                      : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2.5 13.8L19.5 3.5L14.2 21.2L10.8 14.2L2.5 13.8Z" />
                  </svg>
                  <span>飞书快捷登录</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLoginMethod('password')}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                    loginMethod === 'password'
                      ? 'bg-white/15 text-white font-semibold shadow-sm'
                      : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>账号密码登录</span>
                </button>
              </div>

              {/* 方式 1: 飞书快捷 SSO 登录 */}
              {loginMethod === 'feishu' ? (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={handleFeishuLogin}
                    disabled={isLoading}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#2f6cf6] to-[#1c55e8] hover:from-[#3a75ff] hover:to-[#2560f2] text-white font-semibold text-sm transition-all duration-200 shadow-[0_8px_24px_rgba(47,108,246,0.35),inset_0_1px_0_rgba(255,255,255,0.25)] flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99]"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>授权跳转中...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M2.5 13.8L19.5 3.5L14.2 21.2L10.8 14.2L2.5 13.8Z" />
                        </svg>
                        <span>使用飞书快捷授权登录</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                /* 方式 2: 开发者账号密码登录 */
                <form onSubmit={handlePasswordLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-white/70">用户名 / 邮箱</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                      <input
                        type="text"
                        placeholder="请输入用户名或工号"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        disabled={isLoading || isPasswordLoading}
                        className="w-full pl-10 pr-4 py-2.5 bg-black/30 border border-white/[0.12] rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-400 focus:bg-black/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        autoComplete="username"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-white/70">登录密码</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="请输入密码"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading || isPasswordLoading}
                        className="w-full pl-10 pr-10 py-2.5 bg-black/30 border border-white/[0.12] rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-400 focus:bg-black/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors cursor-pointer"
                        disabled={isLoading || isPasswordLoading}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* 高质感渐变提交按钮 */}
                  <button
                    type="submit"
                    disabled={isLoading || isPasswordLoading || !username.trim() || !password.trim()}
                    className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm transition-all duration-150 shadow-[0_4px_20px_rgba(37,99,235,0.35),inset_0_1px_0_rgba(255,255,255,0.2)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
                  >
                    {isPasswordLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>正在验证安全凭据...</span>
                      </>
                    ) : (
                      <>
                        <span>安全登录</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* 底部协议小字 */}
              <div className="text-center text-[11px] text-white/35 pt-5 mt-6 border-t border-white/[0.08]">
                登录即代表您已阅读并同意 <span className="text-white/60 hover:text-white cursor-pointer transition-colors">服务条款</span> 与 <span className="text-white/60 hover:text-white cursor-pointer transition-colors">隐私保护政策</span>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

