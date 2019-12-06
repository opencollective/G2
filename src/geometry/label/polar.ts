import { each, isArray } from '@antv/util';
import { LooseObject, MappingDatum, Point } from '../../interface';
import { getPointAngle as getAngleByPoint, getPointRadius } from '../shape/util/path';
import GeometryLabels from './base';

const HALF_PI = Math.PI / 2;

export default class PolarLabels extends GeometryLabels {
  protected getLabelAlign(point) {
    const coordinate = this.coordinate;
    let align;
    if (point.labelEmit) {
      if (point.angle <= Math.PI / 2 && point.angle > -Math.PI / 2) {
        align = 'left';
      } else {
        align = 'right';
      }
    } else if (!coordinate.isTransposed) {
      align = 'center';
    } else {
      const center = coordinate.getCenter();
      const offset = this.getDefaultOffset(point);
      if (Math.abs(point.x - center.x) < 1) {
        align = 'center';
      } else if (point.angle > Math.PI || point.angle <= 0) {
        if (offset > 0) {
          align = 'left';
        } else {
          align = 'right';
        }
      } else {
        if (offset > 0) {
          align = 'right';
        } else {
          align = 'left';
        }
      }
    }
    return align;
  }

  protected getLabelPosition(labelCfg, mappingData: MappingDatum, index: number): LooseObject {
    let factor = 1;
    let arcPoint;
    if (this.isToMiddle(mappingData)) {
      arcPoint = this.getMiddlePoint(mappingData.points as Point[]);
    } else {
      if (labelCfg.content.length === 1 && index === 0) {
        index = 1;
      } else if (index === 0) {
        factor = -1;
      }
      arcPoint = this.getArcPoint(mappingData, index);
    }

    const offset = this.getDefaultOffset(labelCfg) * factor;
    const middleAngle = this.getPointAngle(arcPoint);
    const isLabelEmit = labelCfg.labelEmit;
    let labelPositionCfg = this.getCirclePoint(middleAngle, offset, arcPoint, isLabelEmit);
    if (!labelPositionCfg) {
      labelPositionCfg = { content: '' };
    } else {
      labelPositionCfg.content = labelCfg.content[index];
      labelPositionCfg.angle = middleAngle;
      labelPositionCfg.color = mappingData.color;
    }

    labelPositionCfg.rotate = labelCfg.autoRotate
      ? this.getLabelRotate(middleAngle, offset, isLabelEmit)
      : labelCfg.rotate;
    labelPositionCfg.start = {
      x: arcPoint.x,
      y: arcPoint.y,
    };
    return labelPositionCfg;
  }

  protected getArcPoint(mappingData: MappingDatum, index: number = 0): Point {
    let arcPoint;
    if (!isArray(mappingData.x) && !isArray(mappingData.y)) {
      arcPoint = {
        x: mappingData.x,
        y: mappingData.y,
      };
    } else {
      arcPoint = {
        x: isArray(mappingData.x) ? mappingData.x[index] : mappingData.x,
        y: isArray(mappingData.y) ? mappingData.y[index] : mappingData.y,
      };
    }

    this.transLabelPoint(arcPoint);
    return arcPoint;
  }

  // 获取点所在的角度
  protected getPointAngle(point: Point): number {
    return getAngleByPoint(this.coordinate, point);
  }

  protected getCirclePoint(angle: number, offset: number, point: Point, isLabelEmit: boolean): LooseObject {
    const coordinate = this.coordinate;
    const center = coordinate.getCenter();
    let r = getPointRadius(coordinate, point);
    if (r === 0) {
      return null;
    }

    let labelAngle = angle;
    if (coordinate.isTransposed && r > offset && !isLabelEmit) {
      const appendAngle = Math.asin(offset / (2 * r));
      labelAngle = angle + appendAngle * 2;
    } else {
      r = r + offset;
    }

    return {
      x: center.x + r * Math.cos(labelAngle),
      y: center.y + r * Math.sin(labelAngle),
      labelAngle,
      r,
    };
  }

  // angle 为弧度
  protected getLabelRotate(angle: number, offset: number, isLabelEmit: boolean) {
    // let rotate;
    // rotate = angle * 180 / Math.PI;
    // rotate += 90;

    // if (isLabelEmit) {
    //   rotate -= 90;
    // }
    // if (rotate) {
    //   if (rotate > 90) {
    //     rotate = rotate - 180;
    //   } else if (rotate < -90) {
    //     rotate = rotate + 180;
    //   }
    // }
    // return rotate / 180 * Math.PI;

    let rotate = angle + HALF_PI;
    if (isLabelEmit) {
      rotate -= HALF_PI;
    }
    if (rotate) {
      if (rotate > HALF_PI) {
        rotate = rotate - Math.PI;
      } else if (rotate < -HALF_PI) {
        rotate = rotate + Math.PI;
      }
    }
    return rotate;
  }

  // 获取中心的位置
  private getMiddlePoint(points: Point[]) {
    const coordinate = this.coordinate;
    const count = points.length;
    let middlePoint = {
      x: 0,
      y: 0,
    };
    each(points, (point: Point) => {
      middlePoint.x += point.x;
      middlePoint.y += point.y;
    });
    middlePoint.x /= count;
    middlePoint.y /= count;

    middlePoint = coordinate.convert(middlePoint);
    return middlePoint;
  }

  // 是否居中
  private isToMiddle(mappingData: MappingDatum) {
    return (mappingData.x as number[]).length > 2;
  }
}
