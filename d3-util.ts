import { ElementRef } from '@angular/core';
import * as d3 from 'd3';

export type SA = S<any, any>;
export type SB = S<d3.BaseType, {}>;
export type S<T extends d3.BaseType, D> = d3.Selection<T, D, Element, {}>;
export type TScale = d3.ScaleTime<number, number>;
export type LScale = d3.ScaleLinear<number, number>;
export type BScale = d3.ScaleBand<string>;
export type Range = [number, number];

export interface Mergeable {
    merge(other: Mergeable): any;
}

export interface LegendInfoMap {
    [key: string]: LegendInfo;
}

export interface LegendInfo {
    attr: Attr;
    color: string;
}

export interface Attr {
    value: string;
    viewValue: string;
}

export interface Margin {
    left: number;
    right: number;
    top: number;
    bottom: number;
}

export interface Point {
    x: number;
    y: number;
}

export class LayoutManager {
    totalHeight: number;
    totalWidth: number;
    height: number;
    width: number;
    left: number;
    bottom: number;
    right: number;
    top: number;

    constructor(totalWidth: number, totalHeight: number, margin: Margin) {
        this.totalWidth = totalWidth;
        this.totalHeight = totalHeight;
        this.height = this.totalHeight - margin.top - margin.bottom;
        this.width = this.totalWidth - margin.left - margin.right;
        this.left = margin.left;
        this.right = margin.right;
        this.bottom = margin.bottom;
        this.top = margin.top;
    }

    createSVG(svgRef: ElementRef): SB {
        return d3.select(svgRef.nativeElement)
            .attr('width', this.totalWidth)
            .attr('height', this.totalHeight);
    }

    createG(svgRef: ElementRef): SB {
        return this.createSVG(svgRef).append('g')
            .attr('transform', translate(this.left, this.top));
    }

    appendG(g: SB) {
        return g.append('g')
            .attr('transform', translate(this.left, this.top));
    }

    axisBottom(g: SB, scale: d3.AxisScale<any>): d3.Axis<any> {
      const axis = d3.axisBottom(scale).ticks(Math.floor(this.width / 30));
      g.append('g').attr('transform', translate(0, this.height)).call(axis);
      return axis;
    }

    axisLeft(g: SB, scale: d3.AxisScale<any>): d3.Axis<any> {
      const axis = d3.axisLeft(scale).ticks(Math.floor(this.height / 30));
      g.append('g').call(axis);
      return axis;
    }

    xLinear(maxValue?: number): LScale {
        const scale = d3.scaleLinear().range([0, this.width]);
        return maxValue ? scale.domain([0, maxValue]) : scale;
    }

    xBand(data: any[], padding = 0.2): BScale {
      return d3.scaleBand().domain(data).range([0, this.width]).padding(padding);
    }

    yBand(data: any[], padding = 0.2): BScale {
      return d3.scaleBand().domain(data).range([this.height, 0]).padding(padding);
    }

    yLinear(maxValue?: number): LScale {
        const scale = d3.scaleLinear().range([this.height, 0]);
        return maxValue ? scale.domain([0, maxValue]) : scale;
    }
}

export function log10TickFormat(d: number) {
    const superscript = '⁰¹²³⁴⁵⁶⁷⁸⁹';
    const power = Math.round(Math.log10(d));
    return 10 + (power + '').split('').map(c => superscript[c]).join('');
}

export function translate(x: number, y: number) {
    return `translate(${x}, ${y})`;
}

export function rotate(degree: number) {
    return `rotate(${degree})`;
}

export function addLegends(svg: S<any, {}>, width = 500, height = 40, legendInfoMap: LegendInfoMap, margin = 15, horizontal = true) {
    let data = Object.values(legendInfoMap).slice();

    if (horizontal) {
        data = data.reverse();
    }

    const g = svg.append('g')
        .selectAll('g')
        .data(data)
        .enter().append('g');

    g.append('circle')
        .attr('r', 3)
        .attr('cx', 2)
        .attr('cy', 11)
        .attr('fill', d => d.color);

    g.append('text')
        .attr('dx', 10)
        .attr('dy', 14)
        .style('font-size', '0.8em')
        .text(d => d.attr.viewValue);

    let hOffset = 0;
    g.attr('transform', (_, i, nodes) => {
        hOffset += nodes[i].getBoundingClientRect().width;
        if (i > 0) {
            hOffset += margin;
        }
        if (!horizontal) {
            hOffset = width;
        }
        const vOffset = horizontal ? height / 2 - 10 : i * 30;
        return translate(width - hOffset, vOffset);
    });
}

export function binData<T extends Mergeable>(data: T[],
    xKey: string,
    yKey: string,
    width: number): T[] {

    const aggregateSize = Math.ceil(data.length / width);
    if (aggregateSize <= 1) {
        return data;
    }
    let aggCount = 0;
    const binnedData = [];
    const aggSizeData = [];

    let newElem: T = null;

    for (const elem of data) {

        if (aggCount === 0) {
            newElem = elem;
            aggCount += 1;
        } else if (aggCount < aggregateSize) {
            newElem = newElem.merge(elem);
            aggCount += 1;
        } else {
            newElem = newElem.merge(elem);
            aggCount += 1;
            binnedData.push(newElem);
            aggSizeData.push(aggCount);
            aggCount = 0;
        }
    }

    if (aggCount !== 0) {
        binnedData.push(newElem);
        aggSizeData.push(aggCount);
    }

    binnedData.forEach((elem, index) => elem[xKey] /= aggSizeData[index]);
    return binnedData;
}
