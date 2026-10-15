import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { formatHumor } from '../domain/countries';

export interface TimelinePoint {
  date: string;
  dayIndex: number;
  label: string;
  humor: number | null;
  noticias: number;
  suficiente: boolean;
}

const colorScale = d3
  .scaleLinear<string>()
  .domain([-1, -0.5, 0, 0.5, 1])
  .range(['#bf4f22', '#e2a383', '#e6e0d2', '#93b1d6', '#285f9f'])
  .interpolate(d3.interpolateLab as any)
  .clamp(true);

interface DashboardTimelineProps {
  series: TimelinePoint[];
  selectedDateIndex: number;
  windowSize: number;
  scopeTitle: string;
  onSelectDateIndex: (index: number) => void;
}

export const DashboardTimeline: React.FC<DashboardTimelineProps> = ({
  series,
  selectedDateIndex,
  windowSize,
  scopeTitle,
  onSelectDateIndex,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !series.length) return;

    const w = el.clientWidth || 800;
    const h = 200;
    const m = { l: 44, r: 10, t: 12, b: 24 };

    const x = d3
      .scaleBand<number>()
      .domain(series.map((d) => d.dayIndex))
      .range([m.l, w - m.r])
      .padding(0.3);

    const mxA =
      d3.max(series, (d) => (d.humor == null ? 0 : Math.abs(d.humor))) || 0.2;
    const Y = Math.max(0.2, Math.ceil(mxA * 12) / 10);

    const y = d3.scaleLinear().domain([-Y, Y]).range([h - m.b, m.t]);
    const yb = d3
      .scaleLinear()
      .domain([0, d3.max(series, (d) => d.noticias) || 1])
      .range([0, (h - m.t - m.b) * 0.32]);

    d3.select(el).selectAll('svg').remove();

    const svg = d3
      .select(el)
      .append('svg')
      .attr('viewBox', `0 0 ${w} ${h}`)
      .attr('width', '100%')
      .attr('role', 'img')
      .attr('aria-label', `Serie diaria de humor para ${scopeTitle}`);

    const w0 = Math.max(0, selectedDateIndex - windowSize + 1);
    const w1 = selectedDateIndex;

    // Window highlight rectangle
    const x0 = x(w0) ?? m.l;
    const x1 = x(w1) ?? w - m.r;
    svg
      .append('rect')
      .attr('x', x0 - (x.step() * x.padding()) / 2)
      .attr('width', Math.max(0, x1 - x0 + x.step()))
      .attr('y', m.t)
      .attr('height', h - m.t - m.b)
      .attr('fill', '#285f9f14');

    // Volume bars (noticias)
    svg
      .append('g')
      .selectAll('rect')
      .data(series)
      .join('rect')
      .attr('x', (d) => x(d.dayIndex) ?? 0)
      .attr('width', x.bandwidth())
      .attr('y', (d) => h - m.b - yb(d.noticias))
      .attr('height', (d) => yb(d.noticias))
      .attr('fill', '#d9d2c3');

    // Grid lines and Y labels
    [-Y, 0, Y].forEach((v) => {
      svg
        .append('line')
        .attr('x1', m.l)
        .attr('x2', w - m.r)
        .attr('y1', y(v))
        .attr('y2', y(v))
        .attr('stroke', v ? '#e7e1d5' : '#9b968b')
        .attr('stroke-dasharray', v ? '' : '3 3');

      svg
        .append('text')
        .attr('x', m.l - 8)
        .attr('y', y(v) + 4)
        .attr('text-anchor', 'end')
        .attr('font', '11px IBM Plex Mono')
        .attr('fill', '#61656e')
        .text(formatHumor(v));
    });

    // X date labels
    series.forEach((d) => {
      if (d.dayIndex % 5 === 0 || d.dayIndex === series.length - 1) {
        svg
          .append('text')
          .attr('x', (x(d.dayIndex) ?? 0) + x.bandwidth() / 2)
          .attr('y', h - 6)
          .attr('text-anchor', 'middle')
          .attr('font', '11px IBM Plex Mono')
          .attr('fill', '#61656e')
          .text(d.label);
      }
    });

    const cx = (d: TimelinePoint) => (x(d.dayIndex) ?? 0) + x.bandwidth() / 2;

    // Mood line
    const lineGenerator = d3
      .line<TimelinePoint>()
      .defined((d) => d.noticias > 0 && d.humor !== null)
      .x(cx)
      .y((d) => y(d.humor!))
      .curve(d3.curveMonotoneX);

    svg
      .append('path')
      .datum(series)
      .attr('fill', 'none')
      .attr('stroke', '#1c1f26')
      .attr('stroke-width', 1.6)
      .attr('d', lineGenerator as any);

    // Data points circles
    svg
      .append('g')
      .selectAll('circle')
      .data(series.filter((d) => d.noticias > 0 && d.humor !== null))
      .join('circle')
      .attr('cx', cx)
      .attr('cy', (d) => y(d.humor!))
      .attr('r', (d) => (d.dayIndex === selectedDateIndex ? 5 : 3.2))
      .attr('fill', (d) => (d.suficiente ? colorScale(d.humor!) : '#fcfbf7'))
      .attr('stroke', '#1c1f26')
      .attr('stroke-width', (d) => (d.suficiente ? 0.8 : 1.4));

    // Empty markers
    series
      .filter((d) => !d.noticias)
      .forEach((d) => {
        svg
          .append('text')
          .attr('x', cx(d))
          .attr('y', y(0) - 6)
          .attr('text-anchor', 'middle')
          .attr('font', '10px IBM Plex Mono')
          .attr('fill', '#9b968b')
          .text('∅');
      });

    // Clickable hit areas
    const hitG = svg.append('g');
    hitG
      .selectAll('rect')
      .data(series)
      .join('rect')
      .attr('x', (d) => (x(d.dayIndex) ?? 0) - (x.step() * x.padding()) / 2)
      .attr('width', x.step())
      .attr('y', m.t)
      .attr('height', h - m.t - m.b)
      .attr('fill', 'transparent')
      .style('cursor', (d) => (d.noticias ? 'pointer' : 'default'))
      .on('click', (_e, d) => {
        if (d.noticias) {
          onSelectDateIndex(d.dayIndex);
        }
      })
      .append('title')
      .text(
        (d) =>
          `${d.date} · ${
            d.noticias
              ? `${formatHumor(d.humor)} · ${d.noticias} noticias${
                  d.suficiente ? '' : ' · provisional'
                }`
              : 'sin datos'
          }`
      );
  }, [series, selectedDateIndex, windowSize, scopeTitle, onSelectDateIndex]);

  return <div ref={containerRef} id="tl" />;
};
