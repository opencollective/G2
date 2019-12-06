import { deepMix, each, get, isArray, isFunction, isNil, isNumber, isString, map } from '@antv/util';
import LabelsGroup from '../../component/labels-group';
import { FIELD_ORIGIN } from '../../constant';
import { Coordinate, IGroup, IShape, Scale } from '../../dependents';
import { Datum, LooseObject, MappingDatum, Point } from '../../interface';
import Geometry from '../base';
import Element from '../element';
import { LabelOption } from '../interface';

export type GeometryLabelsConstructor = new (cfg: any) => GeometryLabels;

function avg(arr: number[]) {
  let sum = 0;
  each(arr, (value: number) => {
    sum += value;
  });
  return sum / arr.length;
}

// TODO: 移到 util 方法中
// 计算多边形重心: https://en.wikipedia.org/wiki/Centroid#Of_a_polygon
function getCentroid(xs, ys) {
  if (isNumber(xs) && isNumber(ys)) {
    // 普通色块图，xs 和 ys 是数值
    return [xs, ys];
  }
  let i = -1;
  let x = 0;
  let y = 0;
  let former;
  let current = xs.length - 1;
  let diff;
  let k = 0;
  while (++i < xs.length) {
    former = current;
    current = i;
    k += diff = xs[former] * ys[current] - xs[current] * ys[former];
    x += (xs[former] + xs[current]) * diff;
    y += (ys[former] + ys[current]) * diff;
  }
  k *= 3;
  return [x / k, y / k];
}

export default class GeometryLabels {
  public readonly geometry: Geometry;
  public readonly container: IGroup;

  protected coordinate: Coordinate;

  // TODO: 类型定义
  private labelCfgs: LooseObject[] = [];
  private labelsGroup: LabelsGroup;

  constructor(geometry: Geometry) {
    this.geometry = geometry;
    this.container = geometry.labelsContainer;
    this.coordinate = geometry.coordinate;
  }

  public renderLabels(mapppingArray: MappingDatum[], shapes: IShape[]) {
    let items = this.getLabelsItems(mapppingArray, shapes);
    items = this.adjustItems(items);
    this.drawLines(items);

    const adjustType = get(this.geometry.labelOption, ['cfg', 'adjustType']);
    const labelsGroup = new LabelsGroup({
      items,
      container: this.container,
      shapes,
      adjustType,
    });
    labelsGroup.render();
    this.labelsGroup = labelsGroup;

    // labelsRenderer.set('items', items.filter((item, i) => {
    //   if (!item) {
    //     shapes.splice(i, 1);
    //     return false;
    //   }
    //   return true;
    // }));
    // if (type) {
    //   labelsRenderer.set('shapes', shapes);
    //   labelsRenderer.set('type', type);
    //   labelsRenderer.set('points', points);
    // }
    // labelsRenderer.set('canvas', this.get('canvas'));
    // labelsRenderer.draw();
  }

  protected setLabelPosition(labelPositionCfg, mappingData: MappingDatum, index: number, position: string) {}

  protected lineToLabel(item) {}

  protected adjustItems(items) {
    each(items, (item) => {
      if (!item) {
        return;
      }
      if (item.offsetX) {
        item.x += item.offsetX;
      }
      if (item.offsetY) {
        item.y += item.offsetY;
      }
    });
    return items;
  }

  protected drawLines(items) {
    each(items, (item) => {
      if (!item) {
        return;
      }
      if (item.offset > 0 && item.labelLine) {
        this.lineToLabel(item);
      }
    });
  }

  protected transLabelPoint(labelPositionCfg) {
    const coordinate = this.coordinate;
    const tmpPoint = coordinate.applyMatrix(labelPositionCfg.x, labelPositionCfg.y, 1);
    labelPositionCfg.x = tmpPoint[0];
    labelPositionCfg.y = tmpPoint[1];
  }

  protected getDefaultOffset(labelCfg) {
    const coordinate = this.coordinate;
    const vector = this.getOffsetVector(labelCfg.offset);
    return coordinate.isTransposed ? vector[0] : vector[1];
  }

  protected getLabelOffset(labelCfg, index: number, total: number) {
    const offset = this.getDefaultOffset(labelCfg);
    const coordinate = this.coordinate;
    const transposed = coordinate.isTransposed;
    const dim = transposed ? 'x' : 'y';
    const factor = transposed ? 1 : -1; // y 方向上越大，像素的坐标越小，所以transposed时将系数变成
    const offsetPoint = {
      x: 0,
      y: 0,
    };
    if (index > 0 || total === 1) {
      // 判断是否小于0
      offsetPoint[dim] = offset * factor;
    } else {
      offsetPoint[dim] = offset * factor * -1;
    }
    return offsetPoint;
  }

  // TODO: 定义返回值的类型
  protected getLabelPosition(labelCfg, mappingData: MappingDatum, index: number): LooseObject {
    const coordinate = this.coordinate;
    const total = labelCfg.content.length;

    function getDimValue(value, idx) {
      let v = value;
      if (isArray(v)) {
        if (labelCfg.content.length === 1) {
          // 如果仅一个 label，多个 y, 取最后一个 y
          if (v.length <= 2) {
            v = v[value.length - 1];
          } else {
            v = avg(v);
          }
        } else {
          v = v[idx];
        }
      }
      return v;
    }

    const label = {
      content: labelCfg.content[index],
      x: 0,
      y: 0,
      start: { x: 0, y: 0 },
      color: '#fff',
    };
    // 多边形场景，多用于地图
    if (mappingData && this.geometry.type === 'polygon') {
      const centroid = getCentroid(mappingData.x, mappingData.y);
      label.x = centroid[0];
      label.y = centroid[1];
    } else {
      label.x = getDimValue(mappingData.x, index);
      label.y = getDimValue(mappingData.y, index);
    }

    // get nearest point of the shape as the label line start point
    if (mappingData && mappingData.nextPoints && ['funnel', 'pyramid'].includes(mappingData.shape)) {
      let maxX = -Infinity;
      mappingData.nextPoints.forEach((p) => {
        const p1 = coordinate.convert(p);
        if (p1.x > maxX) {
          maxX = p1.x;
        }
      });
      label.x = (label.x + maxX) / 2;
    }
    // sharp edge of the pyramid
    if (mappingData.shape === 'pyramid' && !mappingData.nextPoints && mappingData.points) {
      (mappingData.points as Point[]).forEach((p: Point) => {
        let p1 = p;
        p1 = coordinate.convert(p1);
        if (
          (isArray(p1.x) && (mappingData.x as number[]).indexOf(p1.x) === -1) ||
          (isNumber(p1.x) && mappingData.x !== p1.x)
        ) {
          label.x = (label.x + p1.x) / 2;
        }
      });
    }

    if (labelCfg.position) {
      this.setLabelPosition(label, mappingData, index, labelCfg.position);
    }
    const offsetPoint = this.getLabelOffset(labelCfg, index, total);
    // if (labelCfg.offsetX) {
    //   offsetPoint.x += labelCfg.offsetX;
    // }
    // if (labelCfg.offsetY) {
    //   offsetPoint.y += labelCfg.offsetY;
    // }
    this.transLabelPoint(label);
    label.start = { x: label.x, y: label.y };
    label.x += offsetPoint.x;
    label.y += offsetPoint.y;
    label.color = mappingData.color;
    return label;
  }

  protected getLabelAlign(item, index: number, total: number) {
    let align = 'center';
    const coordinate = this.coordinate;
    if (coordinate.isTransposed) {
      const offset = this.getDefaultOffset(item);
      if (offset < 0) {
        align = 'right';
      } else if (offset === 0) {
        align = 'center';
      } else {
        align = 'left';
      }
      if (total > 1 && index === 0) {
        if (align === 'right') {
          align = 'left';
        } else if (align === 'left') {
          align = 'right';
        }
      }
    }
    return align;
  }

  private getLabelsItems(mapppingArray: MappingDatum[], shapes: IShape[]) {
    const items = [];
    const labelCfgs = this.getLabelCfgs(mapppingArray);
    // 获取label相关的x，y的值，获取具体的x,y,防止存在数组
    each(mapppingArray, (mappingData: MappingDatum, index: number) => {
      const labelCfg = labelCfgs[index];
      if (!labelCfg) {
        items.push(null);
        return;
      }

      const labelContent = !isArray(labelCfg.content) ? [labelCfg.content] : labelCfg.content;
      const total = labelContent.length;
      each(labelContent, (content, subIndex) => {
        if (isNil(content) || content === '') {
          items.push(null);
          return;
        }

        const item = {
          ...labelCfg,
          ...this.getLabelPosition(labelCfg, mappingData, subIndex),
        };
        if (!item.textAlign) {
          item.textAlign = this.getLabelAlign(item, subIndex, total);
        }

        items.push(item);
      });
    });
    return items;
  }

  private getLabelCfgs(mapppingArray: MappingDatum[]) {
    const geometry = this.geometry;
    const { type, theme, labelOption } = geometry;
    const { fields, callback, cfg } = labelOption as LabelOption;

    const scales = map(fields, (field: string) => geometry.createScale(field));

    const labelCfgs = [];
    each(mapppingArray, (mappingData: MappingDatum, index: number) => {
      let labelCfg;
      const origin = mappingData[FIELD_ORIGIN]; // 原始数据
      const originText = this.getLabelText(origin, scales);
      if (callback) {
        // 当同时配置了 callback 和 cfg 时，以 callback 为准
        const originValues = fields.map((field: string) => origin[field]);
        const callbackCfg = callback(...originValues);
        if (isNil(callbackCfg)) {
          labelCfgs.push(null);
          return;
        }
        // if (isFunction(callbackCfg.content)) {
        //   callbackCfg.content = callbackCfg.content(origin, mappingData, index);
        // } else {
        //   callbackCfg.content = callbackCfg.content || originText[0];
        // }

        // if (isFunction(callbackCfg.position)) {
        //   callbackCfg.position = callbackCfg.position(origin, mappingData, index);
        // }

        labelCfg = {
          ...cfg,
          ...callbackCfg,
        };
      } else {
        labelCfg = {
          ...cfg,
          // content: originText[0], // 默认展示声明的第一个字段对应的值
        };
      }

      if (isFunction(labelCfg.content)) {
        labelCfg.content = labelCfg.content(origin, mappingData, index);
      } else {
        labelCfg.content = labelCfg.content || originText[0];
      }

      if (isFunction(labelCfg.position)) {
        labelCfg.position = labelCfg.position(origin, mappingData, index);
      }

      if (type === 'polygon' || (labelCfg.offset < 0 && !['line', 'point', 'path'].includes(type))) {
        // polygon 或者 offset 小于 0 时，文本展示在图形内部，将其颜色设置为 白色
        labelCfg = deepMix({}, theme.innerLabels, labelCfg);
      } else {
        labelCfg = deepMix({}, theme.label, labelCfg);
      }

      labelCfg.data = origin; // 存储文本对应的原始数据记录
      labelCfgs.push(labelCfg);
    });

    return labelCfgs;
  }

  private getLabelText(origin: Datum, scales: Scale[]) {
    const labelTexts = [];
    each(scales, (scale: Scale) => {
      let value = origin[scale.field];
      if (isArray(value)) {
        value = value.map((subVal) => {
          return scale.getText(subVal);
        });
      } else {
        value = scale.getText(value);
      }

      if (isNil(value) || value === '') {
        labelTexts.push(null);
      } else {
        labelTexts.push(value);
      }
    });
    return labelTexts;
  }

  private getOffsetVector(offset = 0) {
    const coordinate = this.coordinate;
    // 如果 x,y 翻转，则偏移 x，否则偏移 y
    return coordinate.isTransposed ? coordinate.applyMatrix(offset, 0) : coordinate.applyMatrix(0, offset);
  }
}
