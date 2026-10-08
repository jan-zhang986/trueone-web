import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Copy,
  Check,
  FileText,
  Boxes,
  BookOpen,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';

interface WelcomePageProps {
  onEnterWorkspace?: () => void;
}

// 交互式深海灵动粒子小狗与流体水波画布 (Interactive Cyber Dog Particle & Rocket Fluid Canvas)
function DogParticleCanvas() {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // 1. 生成灵动小狗 (Cyber Dog / 柴犬形态) 粒子点阵骨架
    interface DogAnchor {
      localX: number;
      localY: number;
      baseX: number;
      baseY: number;
      size: number;
      brightness: number;
      tier: number; // 0 (头部先导) ~ 1 (尾部强弹性拖曳)
      isTail?: boolean;
      currX: number;
      currY: number;
      vx: number;
      vy: number;
    }

    const generateDogLattice = (): DogAnchor[] => {
      const anchors: DogAnchor[] = [];
      const step = 7.5; // 点阵密度

      for (let x = -135; x <= 140; x += step) {
        for (let y = -105; y <= 95; y += step) {
          const jx = x + (Math.random() - 0.5) * 2.8;
          const jy = y + (Math.random() - 0.5) * 2.8;

          let inside = false;
          let isTail = false;

          // 眼睛抠空区域 (Eye Cutout at x: -80, y: -24)
          const eyeDist = Math.hypot(jx - (-80), jy - (-24));
          if (eyeDist < 10) continue;

          // (1) 口鼻区 (Snout & Muzzle)
          if (jx >= -130 && jx < -85) {
            const t = (jx + 130) / 45;
            const top = -16 - t * 8;
            const bottom = -2 + t * 9;
            if (jy >= top && jy <= bottom) inside = true;
          }

          // (2) 头部颅骨 (Cranium & Cheek)
          if (jx >= -85 && jx < -45) {
            const headDist = Math.hypot(jx - (-65), jy - (-18));
            if (headDist <= 28) inside = true;
          }

          // (3) 立耳 (Alert Pointy Ears)
          // 前耳 (Front Ear)
          if (jx >= -76 && jx <= -52 && jy <= -44 && jy >= -92) {
            const earT = (jy + 92) / 48; // 0 at tip, 1 at base
            const halfW = earT * 12;
            const center = -64 + earT * 2;
            if (Math.abs(jx - center) <= halfW) inside = true;
          }
          // 后耳 (Back Ear)
          if (jx >= -94 && jx <= -70 && jy <= -42 && jy >= -86) {
            const earT = (jy + 86) / 44;
            const halfW = earT * 11;
            const center = -82 + earT * 2;
            if (Math.abs(jx - center) <= halfW) inside = true;
          }

          // (4) 颈部与挺拔胸膛 (Neck & Proud Chest)
          if (jx >= -50 && jx < 5) {
            const neckT = (jx + 50) / 55;
            const top = -24 + neckT * 4;
            const bottom = 12 + Math.sin(neckT * Math.PI * 0.8) * 26;
            if (jy >= top && jy <= bottom) inside = true;
          }

          // (5) 躯干与腰腹 (Torso & Waist)
          if (jx >= 5 && jx <= 75) {
            const bodyT = (jx - 5) / 70;
            const top = -22 + Math.sin(bodyT * Math.PI) * 4;
            const bottom = 32 - bodyT * 18; // 腹部收拢
            if (jy >= top && jy <= bottom) inside = true;
          }

          // (6) 前肢奔跑跨步 (Front Legs - Trotting Stance)
          // 前肢 A
          if (jx >= -20 && jx <= -4 && jy > 28 && jy <= 84) {
            const legT = (jy - 28) / 56;
            const center = -12 + legT * 6;
            if (Math.abs(jx - center) <= 6.5) inside = true;
          }
          // 前肢 B (后收)
          if (jx >= -38 && jx <= -22 && jy > 24 && jy <= 76) {
            const legT = (jy - 24) / 52;
            const center = -30 - legT * 4;
            if (Math.abs(jx - center) <= 6) inside = true;
          }

          // (7) 后肢强劲腿肌与爪子 (Hind Legs & Thigh)
          // 大腿骨骼肌肉
          if (jx >= 46 && jx <= 84 && jy >= -12 && jy <= 38) {
            const thighDist = Math.hypot(jx - 65, jy - 12);
            if (thighDist <= 22) inside = true;
          }
          // 后肢 A
          if (jx >= 56 && jx <= 76 && jy > 38 && jy <= 85) {
            const legT = (jy - 38) / 47;
            const center = 66 + legT * 4;
            if (Math.abs(jx - center) <= 6.5) inside = true;
          }
          // 后肢 B
          if (jx >= 36 && jx <= 54 && jy > 34 && jy <= 76) {
            const legT = (jy - 34) / 42;
            const center = 45 - legT * 5;
            if (Math.abs(jx - center) <= 6) inside = true;
          }

          // (8) 向上卷翘的欢快尾巴 (Upward Curled Cheerful Tail)
          if (jx >= 70 && jx <= 135 && jy <= -10 && jy >= -102) {
            // 贝塞尔弧度拟合
            const tailT = Math.min(1, Math.max(0, (jy - (-14)) / (-86)));
            const curveX = 74 + Math.sin(tailT * Math.PI) * 44 - tailT * 12;
            if (Math.abs(jx - curveX) <= 9 * (1 - tailT * 0.45)) {
              inside = true;
              isTail = true;
            }
          }

          if (inside) {
            // 头部响应最快 (tier ~ 0)，尾巴与后肢具有最大惯性拉伸感 (tier ~ 1)
            const lagTier = Math.max(0, Math.min(1, (jx + 120) / 250));
            anchors.push({
              localX: jx,
              localY: jy,
              baseX: jx,
              baseY: jy,
              size: Math.random() * 1.5 + 1.2,
              brightness: Math.random() * 0.4 + 0.6,
              tier: lagTier,
              isTail,
              currX: width * 0.58 + jx,
              currY: height * 0.42 + jy,
              vx: 0,
              vy: 0,
            });
          }
        }
      }
      return anchors;
    };

    const dogParticles = generateDogLattice();

    // 狗狗主体固定在屏幕右侧居中位置 (与截图终端背景对齐)
    // 恒定不旋转，固定在一个位置
    const dog = {
      x: width * 0.56,
      y: height * 0.44,
      scale: 1.15,
    };

    // 2. 赛博光子微量气泡队列 (Cyber Ambient Sparks)
    interface JetParticle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
      color: string;
    }
    const jetParticles: JetParticle[] = [];

    // 3. 水波涟漪队列 (Concentric Water Ripples)
    interface Ripple {
      x: number;
      y: number;
      radius: number;
      maxRadius: number;
      speed: number;
      alpha: number;
    }
    const ripples: Ripple[] = [];

    const addRipple = (x: number, y: number, isClick: boolean = false) => {
      ripples.push({
        x,
        y,
        radius: isClick ? 8 : 4,
        maxRadius: isClick ? Math.min(width, height) * 0.45 : 120,
        speed: isClick ? 4.2 : 2.2,
        alpha: isClick ? 0.9 : 0.45,
      });
      if (isClick) {
        setTimeout(() => {
          ripples.push({
            x,
            y,
            radius: 4,
            maxRadius: Math.min(width, height) * 0.38,
            speed: 3.2,
            alpha: 0.6,
          });
        }, 130);
      }
    };

    // 交互显隐可见度：平时正常不显示 (0)，只有鼠标移动到中间区域时才平滑显现 (1)
    let dogVisibility = 0;

    // 鼠标交互监听
    let mouseX = -9999;
    let mouseY = -9999;

    const handlePointerDown = (e: PointerEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      addRipple(e.clientX, e.clientY, true);

      // 如果在中央小狗区域附近点击，瞬间唤醒显现
      const distToCenter = Math.hypot(e.clientX - dog.x, e.clientY - dog.y);
      if (distToCenter < 360) {
        dogVisibility = Math.max(dogVisibility, 0.95);
      }

      // 点击产生粒子向外涟漪冲击微波 (随后弹性回位)
      for (const p of dogParticles) {
        const dx = p.currX - e.clientX;
        const dy = p.currY - e.clientY;
        const dist = Math.hypot(dx, dy);
        if (dist < 300 && dist > 0) {
          const impulse = (1 - dist / 300) * 12;
          p.vx += (dx / dist) * impulse;
          p.vy += (dy / dist) * impulse;
        }
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      if (Math.random() < 0.25) {
        addRipple(e.clientX, e.clientY, false);
      }
    };

    const handlePointerLeave = () => {
      mouseX = -9999;
      mouseY = -9999;
    };

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      dog.x = width * 0.54;
      dog.y = height * 0.44;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerleave', handlePointerLeave);

    let time = 0;

    // 60FPS 渲染物理管线
    const render = () => {
      time += 0.025;
      ctx.clearRect(0, 0, width, height);

      // --- 1. 固定在中间指定位置 ---
      dog.x = width * 0.54;
      dog.y = height * 0.44 + Math.sin(time * 0.8) * 3.5;

      // 绝对不旋转：严格恒定为 0 角度
      const cos = 1;
      const sin = 0;

      // --- 2. 核心特性：移动到中间才显现狗狗，平时正常完全不显示 ---
      let targetVisibility = 0;
      if (mouseX > 0 && mouseY > 0) {
        // 计算鼠标与中央狗狗位置的距离
        const distToCenter = Math.hypot(mouseX - dog.x, mouseY - dog.y);
        const triggerRadius = 360; // 进入中间 ~360px 范围即开始浮现
        if (distToCenter < triggerRadius) {
          targetVisibility = Math.min(1, Math.pow(1 - distToCenter / triggerRadius, 0.72));
        }
      }

      // 平滑浮现与淡出 (淡入迅速，淡出优雅平缓)
      const lerpSpeed = targetVisibility > dogVisibility ? 0.09 : 0.045;
      dogVisibility += (targetVisibility - dogVisibility) * lerpSpeed;

      // 仅当狗狗可见度大于微小阈值时才进行粒子与网格渲染，平时彻底隐形且零多余绘制
      if (dogVisibility > 0.005) {
        const tailWag = Math.sin(time * 7) * 9;

        // 尾尖环境赛博光子微量溢出 (仅可见时触发)
        if (dogVisibility > 0.4 && Math.random() < 0.2) {
          const tailX = dog.x + 105 * dog.scale;
          const tailY = dog.y + (-85 + tailWag) * dog.scale;
          jetParticles.push({
            x: tailX + (Math.random() - 0.5) * 8,
            y: tailY + (Math.random() - 0.5) * 8,
            vx: Math.random() * 0.5 + 0.2,
            vy: -Math.random() * 1.0 - 0.3,
            size: Math.random() * 2.6 + 1.2,
            alpha: 0.75 * dogVisibility,
            color: Math.random() > 0.4 ? '#dbeafe' : '#60a5fa',
          });
        }

        // 渲染环境微光粒子
        for (let i = jetParticles.length - 1; i >= 0; i--) {
          const jp = jetParticles[i];
          jp.x += jp.vx;
          jp.y += jp.vy;
          jp.alpha *= 0.94;
          jp.size *= 0.97;

          if (jp.alpha < 0.02) {
            jetParticles.splice(i, 1);
            continue;
          }

          ctx.save();
          ctx.beginPath();
          ctx.arc(jp.x, jp.y, jp.size, 0, Math.PI * 2);
          ctx.fillStyle = jp.color;
          ctx.globalAlpha = jp.alpha * dogVisibility;
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.restore();
        }

        // --- 3. 渲染小狗粒子骨架 (固定位置 + 鼠标接近流体微排斥弹性回弹 + 欢快摇尾) ---
        for (const p of dogParticles) {
          let lx = p.baseX;
          let ly = p.baseY;

          // 如果是尾巴粒子，在原位欢快摇摆
          if (p.isTail) {
            ly += tailWag * p.tier;
          }

          // 恒定无旋转目标坐标
          const targetPx = dog.x + lx * dog.scale;
          const targetPy = dog.y + ly * dog.scale;

          // 鼠标流体排斥力场交互 (鼠标接近粒子时轻微推开，离开后弹性归位)
          const mdx = p.currX - mouseX;
          const mdy = p.currY - mouseY;
          const mdist = Math.hypot(mdx, mdy);
          if (mdist < 100 && mdist > 0) {
            const force = (1 - mdist / 100) * 2.8;
            p.vx += (mdx / mdist) * force;
            p.vy += (mdy / mdist) * force;
          }

          // 弹性物理阻尼回弹
          const springStiffness = 0.085;
          const friction = 0.84;

          p.vx = (p.vx + (targetPx - p.currX) * springStiffness) * friction;
          p.vy = (p.vy + (targetPy - p.currY) * springStiffness) * friction;
          p.currX += p.vx;
          p.currY += p.vy;

          // 呼吸粒子闪烁
          const pulse = 0.85 + Math.sin(time * 2 + p.baseX * 0.05) * 0.15;
          // 局部探照光感：越靠近鼠标指针的粒子越明亮
          const localProximity = Math.max(0.4, Math.min(1.2, 1.15 - mdist / 260));
          const alpha = Math.min(1, p.brightness * pulse * dogVisibility * localProximity);

          ctx.save();
          ctx.beginPath();
          ctx.arc(p.currX, p.currY, p.size * (1 - p.tier * 0.15), 0, Math.PI * 2);
          ctx.fillStyle = `rgba(215, 235, 255, ${alpha})`;
          ctx.shadowColor = '#60a5fa';
          ctx.shadowBlur = 6;
          ctx.fill();
          ctx.restore();
        }

        // --- 4. 绘制近邻粒子间的星图微光连线 (Constellation Network Mesh, 如图用户截图) ---
        ctx.save();
        ctx.lineWidth = 0.65;
        const maxConnectDist = 18.5;
        const maxDistSq = maxConnectDist * maxConnectDist;

        for (let i = 0; i < dogParticles.length; i += 2) {
          const p1 = dogParticles[i];
          for (let j = i + 1; j < dogParticles.length; j += 2) {
            const p2 = dogParticles[j];
            const dx = p1.currX - p2.currX;
            const dy = p1.currY - p2.currY;
            const distSq = dx * dx + dy * dy;

            if (distSq < maxDistSq) {
              const dist = Math.sqrt(distSq);
              const lineAlpha = (1 - dist / maxConnectDist) * 0.22 * p1.brightness * p2.brightness * dogVisibility * dogVisibility;
              ctx.strokeStyle = `rgba(147, 197, 253, ${lineAlpha})`;
              ctx.beginPath();
              ctx.moveTo(p1.currX, p1.currY);
              ctx.lineTo(p2.currX, p2.currY);
              ctx.stroke();
            }
          }
        }
        ctx.restore();
      }

      // --- 5. 渲染水波涟漪 (Water Ripples) ---
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += r.speed;
        r.alpha *= 0.965;

        if (r.alpha < 0.01 || r.radius > r.maxRadius) {
          ripples.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(200, 230, 255, ${r.alpha * 0.7})`;
        ctx.lineWidth = Math.max(1, 3.2 * (1 - r.radius / r.maxRadius));
        ctx.shadowColor = '#3b82f6';
        ctx.shadowBlur = 16;
        ctx.stroke();

        if (r.radius > 16) {
          ctx.beginPath();
          ctx.arc(r.x, r.y, r.radius - 8, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(70, 140, 255, ${r.alpha * 0.3})`;
          ctx.lineWidth = 1.8;
          ctx.stroke();
        }
        ctx.restore();
      }

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-10 w-full h-full mix-blend-screen"
    />
  );
}

export function WelcomePage({ onEnterWorkspace }: WelcomePageProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'quick' | 'source'>('quick');
  const [copied, setCopied] = useState(false);
  const [lang, setLang] = useState<'zh' | 'en'>('zh');

  const commands = {
    quick: 'npx @trueone/harness web',
    source: 'git clone https://github.com/trueone-ai/trueone-harness.git\ncd trueone-harness && pnpm install\npnpm dev',
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('已复制命令到剪贴板');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEnter = () => {
    if (onEnterWorkspace) {
      onEnterWorkspace();
    } else {
      navigate('/quality-workspace');
    }
  };

  return (
    <div className="w-screen h-screen bg-[#050811] text-white flex flex-col relative overflow-hidden select-none font-sans">
      {/* 实时交互式灵动粒子小狗与流体水波画布 (奔跑追逐、摇尾推进、星图连线与水波效果) */}
      <DogParticleCanvas />
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
          <pattern id="dotPattern" width="36" height="36" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#7fa8db" opacity="0.45" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dotPattern)" />
      </svg>

      {/* 拟真三维高光流体烟雾波纹 (SVG Fluid Smoke Waves) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden mix-blend-screen opacity-70">
        <svg
          viewBox="0 0 1600 900"
          className="w-full h-full object-cover scale-110 -translate-y-6"
          preserveAspectRatio="none"
        >
          <defs>
            <filter id="smokeBlur1" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="38" />
            </filter>
            <filter id="smokeBlur2" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="65" />
            </filter>
            <linearGradient id="smokeGrad1" x1="20%" y1="0%" x2="80%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
              <stop offset="25%" stopColor="#cfe3ff" stopOpacity="0.65" />
              <stop offset="60%" stopColor="#5b93e6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#1e3b6e" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="smokeGrad2" x1="0%" y1="10%" x2="100%" y2="90%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
              <stop offset="40%" stopColor="#a8cdfc" stopOpacity="0.4" />
              <stop offset="70%" stopColor="#3b6eb8" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#08152e" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* 烟雾主浪带 1 */}
          <path
            d="M 280 -60 C 260 220, 160 380, 240 540 C 310 680, 520 740, 680 820 C 820 890, 1100 920, 1400 960"
            fill="none"
            stroke="url(#smokeGrad1)"
            strokeWidth="56"
            strokeLinecap="round"
            filter="url(#smokeBlur1)"
          />
          {/* 烟雾主浪带 2 (右上延展至中心) */}
          <path
            d="M 1250 -40 C 1100 120, 880 180, 780 320 C 660 480, 860 620, 950 780 C 1020 900, 1150 940, 1380 980"
            fill="none"
            stroke="url(#smokeGrad2)"
            strokeWidth="74"
            strokeLinecap="round"
            filter="url(#smokeBlur2)"
          />
          {/* 细腻烟雾丝流 */}
          <path
            d="M 320 0 C 300 240, 210 380, 300 500 C 380 620, 580 720, 760 790"
            fill="none"
            stroke="#ffffff"
            strokeWidth="18"
            strokeOpacity="0.45"
            filter="url(#smokeBlur1)"
          />
        </svg>
      </div>

      {/* ================= 顶部长廊导航栏 (1:1 对标) ================= */}
      <header className="w-full max-w-[1360px] mx-auto px-8 sm:px-14 h-24 flex items-center justify-between relative z-20">
        {/* 左侧 Logo + 胶囊徽章 */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <img
            src="/trueone-logo-white.png?v=11"
            alt="TrueOne"
            className="h-11 sm:h-12 w-auto object-contain cursor-pointer transition-opacity hover:opacity-90 drop-shadow-[0_0_20px_rgba(56,189,248,0.2)]"
          />

          {/* 拟物高光 Harness 药丸徽章 */}
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

        {/* 右侧控制栏：语言切换器与快速进入 */}
        <div className="flex items-center gap-4">
          {/* 中英文胶囊开关 */}
          <div className="flex items-center p-[2px] rounded-full bg-[#18263e]/70 border border-white/[0.1] text-xs">
            <button
              onClick={() => setLang('zh')}
              className={`px-3 py-1 rounded-full font-medium transition-all ${
                lang === 'zh'
                  ? 'bg-white/20 text-white shadow-sm'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              中文
            </button>
            <button
              onClick={() => setLang('en')}
              className={`px-3 py-1 rounded-full font-medium transition-all ${
                lang === 'en'
                  ? 'bg-white/20 text-white shadow-sm'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              EN
            </button>
          </div>

          {/* 直达系统工作台 */}
          <button
            onClick={handleEnter}
            className="hidden sm:inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-blue-600/80 hover:bg-blue-600 border border-blue-400/30 text-white text-xs font-medium transition-all shadow-[0_0_15px_rgba(59,130,246,0.35)]"
          >
            <span>进入工作台</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* ================= 核心主视口 (Hero Section) ================= */}
      <main className="flex-1 w-full max-w-[1360px] mx-auto px-8 sm:px-14 flex items-center relative z-20 pb-12">
        <div className="w-full grid grid-cols-1 lg:grid-cols-[1.12fr_0.88fr] gap-12 lg:gap-16 items-center">
          
          {/* 左侧文字与操作区 (与图片精确像素对标) */}
          <div className="flex flex-col items-start">
            {/* 副标题标签 */}
            <p className="text-[17px] font-medium tracking-tight text-white/90 mb-3">
              TrueOne Harness 开发者预览版
            </p>

            {/* 大标题：一切皆插件 (纯白、干净、巨大、自信) */}
            <h1 className="text-5xl sm:text-6xl lg:text-[68px] font-bold text-white tracking-[0.4px] leading-tight mb-7">
              一切皆插件
            </h1>

            {/* 说明段落 */}
            <div className="space-y-2 text-[15px] text-white/65 leading-[1.8] max-w-[560px] mb-10 font-normal">
              <p>
                TrueOne Harness 开发者预览版面向全球 Harness 开发者开放测试，并同步开放源代码。
              </p>
              <p>
                模型、工具、技能、会话、沙箱、存储、循环、调度、UI 等所有 Agent 能力均由插件组合而成，可以自由替换和灵活重组。
              </p>
            </div>

            {/* 底部功能按钮横排 (药丸圆角胶囊按钮) */}
            <div className="flex flex-wrap items-center gap-3.5">
              {/* 白色主按钮 */}
              <button
                onClick={handleEnter}
                className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white hover:bg-white/95 text-black font-semibold text-sm transition-all duration-150 shadow-[0_4px_20px_rgba(255,255,255,0.25)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <svg width="17" height="17" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
                </svg>
                <span>查看 GitHub</span>
              </button>

              {/* 次级透明胶囊按钮 1: 开发者文档 */}
              <button
                onClick={() => navigate('/quality-workspace')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.12] text-white/90 hover:text-white text-sm font-medium transition-all backdrop-blur-md cursor-pointer"
              >
                <FileText className="w-4 h-4 text-white/80" />
                <span>开发者文档</span>
              </button>

              {/* 次级透明胶囊按钮 2: 社区插件 */}
              <button
                onClick={() => navigate('/precision-test')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.12] text-white/90 hover:text-white text-sm font-medium transition-all backdrop-blur-md cursor-pointer"
              >
                <Boxes className="w-4 h-4 text-white/80" />
                <span>社区插件</span>
              </button>

              {/* 次级透明胶囊按钮 3: Cordis 论文 */}
              <button
                onClick={() => navigate('/case-management')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.12] text-white/90 hover:text-white text-sm font-medium transition-all backdrop-blur-md cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-white/80" />
                <span>Cordis 论文</span>
              </button>
            </div>
          </div>

          {/* 右侧悬浮终端视窗 (对齐图片右侧卡片与选项卡) */}
          <div className="flex flex-col w-full max-w-[540px] ml-auto">
            {/* 顶附吸附选项卡 (Folder Tabs) */}
            <div className="flex items-center gap-1 pl-3 z-10 -mb-[1px]">
              <button
                onClick={() => setActiveTab('quick')}
                className={`px-5 py-2 text-[13px] font-medium transition-all rounded-t-lg border border-b-0 ${
                  activeTab === 'quick'
                    ? 'bg-[#0f172a]/90 text-white border-white/[0.14] backdrop-blur-xl shadow-lg'
                    : 'bg-transparent text-white/50 hover:text-white border-transparent'
                }`}
              >
                一键使用
              </button>
              <button
                onClick={() => setActiveTab('source')}
                className={`px-5 py-2 text-[13px] font-medium transition-all rounded-t-lg border border-b-0 ${
                  activeTab === 'source'
                    ? 'bg-[#0f172a]/90 text-white border-white/[0.14] backdrop-blur-xl shadow-lg'
                    : 'bg-transparent text-white/50 hover:text-white border-transparent'
                }`}
              >
                源码安装
              </button>
            </div>

            {/* 终端主体面板 (深色透光磨砂质感玻璃容器) */}
            <div className="rounded-2xl rounded-tl-none border border-white/[0.12] bg-[#0c1322]/85 backdrop-blur-2xl shadow-[0_25px_60px_rgba(0,0,0,0.65)] overflow-hidden">
              {/* 控制条：红黄绿红绿灯 + 右侧复制 */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                </div>

                <button
                  onClick={() => handleCopy(commands[activeTab])}
                  className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">已复制</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>复制</span>
                    </>
                  )}
                </button>
              </div>

              {/* 终端命令行代码呈现 */}
              <div className="p-7 font-mono text-[14px] leading-relaxed min-h-[140px] flex items-center">
                <div className="flex items-baseline gap-3 text-white">
                  <span className="text-[#4da2ff] select-none font-bold text-base">$</span>
                  <span className="text-white/95 whitespace-pre-wrap break-all">
                    {commands[activeTab]}
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* 底部极其轻微的边缘渐变光晕 */}
      <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[#050811] to-transparent pointer-events-none" />
    </div>
  );
}
