'use client';

import React, { useRef, useEffect } from 'react';

const CANVAS_SIZE = 180;
const EDGE_DURATION = 800; // ms per edge
const LOOP_PAUSE = 1500; // ms between loops

/**
 * チュートリアル用キャンバスアニメーション.
 * 三角形の各辺が順番に光りながら描画され、ループする。
 * 赤いスタートマーカーが点滅する。
 */
export default function TutorialCanvasAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cx = CANVAS_SIZE / 2;
    const cy = CANVAS_SIZE / 2;
    const r = CANVAS_SIZE * 0.38;

    // 三角形の3頂点
    const vertices = [0, 1, 2].map((i) => ({
      x: cx + r * Math.cos((Math.PI * 2 * i) / 3 - Math.PI / 2),
      y: cy + r * Math.sin((Math.PI * 2 * i) / 3 - Math.PI / 2),
    }));

    // 頂点間を結ぶ3辺
    const edges = [
      { from: vertices[0], to: vertices[1] },
      { from: vertices[1], to: vertices[2] },
      { from: vertices[2], to: vertices[0] },
    ];

    const totalDuration = EDGE_DURATION * edges.length + LOOP_PAUSE;

    const drawFrame = (now: number) => {
      const elapsed = now % totalDuration;

      // 背景クリア
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      // 外側の円（テンプレート）
      ctx.strokeStyle = 'rgba(100, 100, 150, 0.2)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r + 15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      // 辺のテンプレート(点線)
      ctx.strokeStyle = 'rgba(100, 100, 150, 0.15)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      for (const edge of edges) {
        ctx.beginPath();
        ctx.moveTo(edge.from.x, edge.from.y);
        ctx.lineTo(edge.to.x, edge.to.y);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // 赤いスタートマーカー（点滅）
      const pulse = 0.5 + 0.5 * Math.sin((now / 300) % (Math.PI * 2));
      ctx.fillStyle = `rgba(255, 64, 129, ${0.5 + pulse * 0.5})`;
      ctx.beginPath();
      ctx.arc(vertices[0].x, vertices[0].y, 6 + pulse * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ff4081';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(vertices[0].x, vertices[0].y, 10, 0, Math.PI * 2);
      ctx.stroke();

      // 辺を順番に描画
      for (let i = 0; i < edges.length; i++) {
        const edgeStart = i * EDGE_DURATION;
        const edgeEnd = (i + 1) * EDGE_DURATION;
        const edge = edges[i];

        if (elapsed >= edgeEnd) {
          // 完了: 辺全体を光らせて描画
          drawGlowEdge(ctx, edge.from, edge.to);
        } else if (elapsed >= edgeStart) {
          // 進行中: 現在位置まで描画
          const progress = (elapsed - edgeStart) / EDGE_DURATION;
          const currentX = edge.from.x + (edge.to.x - edge.from.x) * progress;
          const currentY = edge.from.y + (edge.to.y - edge.from.y) * progress;

          drawGlowEdge(ctx, edge.from, { x: currentX, y: currentY });

          // 先端の光点
          ctx.shadowBlur = 20;
          ctx.shadowColor = '#00e5ff';
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(currentX, currentY, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 8;
          ctx.fillStyle = '#00e5ff';
          ctx.beginPath();
          ctx.arc(currentX, currentY, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      // 1→2→3 の番号を表示
      for (let i = 0; i < edges.length; i++) {
        const edgeStart = i * EDGE_DURATION;
        const edgeEnd = (i + 1) * EDGE_DURATION;

        if (elapsed >= edgeEnd || (elapsed >= edgeStart && elapsed < edgeEnd)) {
          const midX = (edges[i].from.x + edges[i].to.x) / 2;
          const midY = (edges[i].from.y + edges[i].to.y) / 2;
          ctx.fillStyle = '#00e5ff';
          ctx.font = 'bold 14px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${i + 1}`, midX, midY);
        }
      }

      // 赤いスタート点にSTARTテキスト
      ctx.fillStyle = '#ff4081';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('START', vertices[0].x, vertices[0].y);

      animFrameRef.current = requestAnimationFrame(drawFrame);
    };

    animFrameRef.current = requestAnimationFrame(drawFrame);

    return () => {
      if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-1">
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        className="rounded-lg border border-gray-700/50"
        style={{ background: '#0a0a14' }}
      />
      <p className="animate-pulse text-xs" style={{ color: '#7676aa' }}>
        ▲ お手本を参考にしてください
      </p>
    </div>
  );
}

/** 光るエッジを描画 */
function drawGlowEdge(
  ctx: CanvasRenderingContext2D,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  ctx.shadowBlur = 12;
  ctx.shadowColor = '#00e5ff';
  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.shadowBlur = 0;
}
