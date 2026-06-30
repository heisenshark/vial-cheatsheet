import React from 'react';
import { translateKeycode } from '../keycodes';
import { formatLabel, getTargetLayer } from '../utils';
import type { Theme, ParsedKey } from '../types';

interface LayerSvgProps {
  layerIdx: number;
  keys: ParsedKey[];
  theme: Theme;
  unitSize: number;
  keyGap: number;
  radius: number;
  fontSize: number;
  fontFamily: string;
  labelMode: string;
  colorLayerButtons: boolean;
  arrowColors: string[];
  mappedLayersLength: number;
}

export function LayerSvg({
  layerIdx,
  keys,
  theme,
  unitSize,
  keyGap,
  radius,
  fontSize,
  fontFamily,
  labelMode,
  colorLayerButtons,
  arrowColors,
  mappedLayersLength
}: LayerSvgProps) {
  
  const getDims = () => {
    if (!keys.length) return { w: 0, h: 0, pad: 0.5 };
    const pad = 0.5;
    const maxX = Math.max(...keys.map(k => k.x + k.w));
    const maxY = Math.max(...keys.map(k => k.y + k.h));
    return { w: (maxX + pad * 2) * unitSize, h: (maxY + pad * 2) * unitSize, pad };
  };

  const keyStyle = (key: ParsedKey) => {
    const code = key.keycode ?? '';
    if (code === '__PHANTOM__') return { invisible: true } as any;

    const toLayer = getTargetLayer(code, mappedLayersLength);
    const { type } = translateKeycode(code);

    if (colorLayerButtons && toLayer !== null) {
      const color = arrowColors[toLayer % 8];
      const isNested = (type === 'layertap' || type === 'modtap');
      return {
        fill: color,
        text: '#121212',
        nested: isNested
      };
    }

    switch (type) {
      case 'modifier': return { fill: theme.keyModifier, text: theme.keyModifierText };
      case 'layer':
      case 'accent':   return { fill: theme.keyAccent,   text: theme.keyAccentText };
      case 'layertap': return { fill: theme.keyAccent,   text: theme.keyAccentText,   nested: true };
      case 'modtap':   return { fill: theme.keyModifier, text: theme.keyModifierText, nested: true };
      case 'special':  return { fill: theme.keyAccent,   text: theme.keyAccentText };
      case 'trans':    return { fill: theme.bg, text: theme.keyAlphaText, dashed: true };
      case 'empty':    return { fill: theme.bg, text: theme.keyAlphaText, dashed: true };
      default:         return { fill: theme.keyAlpha,    text: theme.keyAlphaText };
    }
  };

  const { w, h, pad } = getDims();

  return (
    <svg id={`layer-svg-${layerIdx}`} viewBox={`0 0 ${w} ${h}`} width="100%"
      style={{ maxHeight: 420, fontFamily, display: 'block' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Board bezel */}
      <rect x={pad * unitSize - 10} y={pad * unitSize - 10}
        width={w - pad * 2 * unitSize + 20} height={h - pad * 2 * unitSize + 20}
        fill={theme.id === 'mono_print' ? '#ffffff' : theme.boardColor}
        stroke={theme.id === 'mono_print' ? '#000000' : 'none'}
        strokeWidth={theme.id === 'mono_print' ? 1.5 : 0}
        rx={radius + 6} ry={radius + 6} />

      {keys.map((key, i) => {
        const style = keyStyle(key);
        if (style.invisible) return null;

        const x = (key.x + pad) * unitSize;
        const y = (key.y + pad) * unitSize;
        const kw = key.w * unitSize;
        const kh = key.h * unitSize;
        const bx = x + keyGap / 2, by = y + keyGap / 2;
        const bw = kw - keyGap,    bh = kh - keyGap;

        const { label, altLabel } = translateKeycode(key.keycode ?? '');
        const formatted = formatLabel(label, labelMode);
        const lines = (formatted ?? '').split('\n');

        const transform = key.r
          ? `rotate(${key.r} ${(key.rx! + pad) * unitSize} ${(key.ry! + pad) * unitSize})`
          : undefined;

        if (style.nested) {
          const tapLabel  = lines[0] ?? '';
          const holdLabel = (lines[1] ?? '').replace(/[()]/g, '');

          const ip   = 3;
          const innerR = Math.max(0, radius - 2);
          const innerH = Math.round(bh * 0.52);
          const innerW = bw - ip * 2;
          const ix = bx + ip;
          const iy = by + ip;

          const holdY = iy + innerH + (bh - innerH - ip) / 2 + fontSize * 0.35;

          return (
            <g key={i} transform={transform}>
              {theme.id !== 'mono_print' && (
                <rect x={bx} y={by + 2} width={bw} height={bh}
                  fill="rgba(0,0,0,0.18)" rx={radius} ry={radius} />
              )}
              <rect x={bx} y={by} width={bw} height={bh}
                fill={style.fill} stroke={theme.boardColor} strokeWidth={1.5}
                rx={radius} ry={radius} />
              <text x={bx + bw / 2} y={holdY}
                textAnchor="middle" fontSize={fontSize * 0.78} fill={style.text}
                fontWeight="700" style={{ userSelect: 'none', pointerEvents: 'none' }}
              >{holdLabel}</text>
              {theme.id !== 'mono_print' && (
                <rect x={ix} y={iy + 1} width={innerW} height={innerH}
                  fill="rgba(0,0,0,0.2)" rx={innerR} ry={innerR} />
              )}
              <rect x={ix} y={iy} width={innerW} height={innerH}
                fill={theme.keyAlpha} stroke={theme.boardColor} strokeWidth={1}
                rx={innerR} ry={innerR} />
              {theme.id !== 'mono_print' && (
                <rect x={ix + 2} y={iy + 1} width={innerW - 4} height={innerH - 3}
                  fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={1}
                  rx={Math.max(0, innerR - 2)} ry={Math.max(0, innerR - 2)}
                  pointerEvents="none" />
              )}
              {altLabel ? (
                <>
                  <text x={ix + innerW / 2} y={iy + innerH * 0.45}
                    textAnchor="middle" fontSize={fontSize * 0.75} fill={theme.keyAlphaText}
                    fontWeight="700" style={{ userSelect: 'none', pointerEvents: 'none' }}
                  >{altLabel}</text>
                  <text x={ix + innerW / 2} y={iy + innerH * 0.85}
                    textAnchor="middle" fontSize={fontSize * 0.9} fill={theme.keyAlphaText}
                    fontWeight="700" style={{ userSelect: 'none', pointerEvents: 'none' }}
                  >{tapLabel}</text>
                </>
              ) : (
                <text x={ix + innerW / 2} y={iy + innerH / 2 + fontSize * 0.35}
                  textAnchor="middle" fontSize={fontSize} fill={theme.keyAlphaText}
                  fontWeight="700" style={{ userSelect: 'none', pointerEvents: 'none' }}
                >{tapLabel}</text>
              )}
            </g>
          );
        }

        return (
          <g key={i} transform={transform}>
            {!(style as any).ghost && theme.id !== 'mono_print' && (
              <rect x={bx} y={by + 2} width={bw} height={bh}
                fill="rgba(0,0,0,0.15)" rx={radius} ry={radius} />
            )}
            <rect x={bx} y={by} width={bw} height={bh}
              fill={style.fill}
              stroke={
                (style as any).dashed ? theme.keyModifierText + '44'
                : (style as any).ghost  ? theme.keyAlpha + '66'
                : theme.boardColor
              }
              strokeWidth={1.5}
              strokeDasharray={(style as any).dashed ? '4 3' : undefined}
              rx={radius} ry={radius} />
            {!(style as any).dashed && !(style as any).ghost && theme.id !== 'mono_print' && (
              <rect x={bx + 2} y={by + 1} width={bw - 4} height={bh - 3}
                fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={1}
                rx={Math.max(0, radius - 2)} ry={Math.max(0, radius - 2)}
                pointerEvents="none" />
            )}
            {!(style as any).ghost && (
              altLabel ? (
                <text
                  textAnchor="middle" fill={style.text}
                  fontWeight="600" style={{ userSelect: 'none', pointerEvents: 'none' }}
                >
                  <tspan x={x + kw / 2} y={y + kh * 0.4} fontSize={fontSize * 0.75}>{altLabel}</tspan>
                  <tspan x={x + kw / 2} y={y + kh * 0.75} fontSize={fontSize}>{lines[0]}</tspan>
                </text>
              ) : (
                <text
                  x={x + kw / 2}
                  y={y + kh / 2 + (lines.length > 1 ? -fontSize / 2 : fontSize / 3.5)}
                  textAnchor="middle" fontSize={fontSize} fill={style.text}
                  fontWeight="600" style={{ userSelect: 'none', pointerEvents: 'none' }}
                >
                  {lines.map((ln, li) => (
                    <tspan key={li} x={x + kw / 2} dy={li > 0 ? fontSize + 2 : 0}>{ln}</tspan>
                  ))}
                </text>
              )
            )}
          </g>
        );
      })}
    </svg>
  );
}
