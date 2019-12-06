import { MappingDatum, Point } from '../../interface';
import GeometryLabels from './base';

export default class IntervalLabels extends GeometryLabels {
  protected setLabelPosition(labelPositionCfg, mappingData: MappingDatum, index: number, position: string) {
    const coordinate = this.coordinate;
    const transposed = coordinate.isTransposed;
    const shapePoints = mappingData.points as Point[];
    const point0 = coordinate.convertPoint(shapePoints[0]);
    const point1 = coordinate.convertPoint(shapePoints[2]);
    const width = ((point0.x - point1.x) / 2) * (transposed ? -1 : 1);
    const height = ((point0.y - point1.y) / 2) * (transposed ? -1 : 1);

    switch (position) {
      case 'right':
        if (transposed) {
          labelPositionCfg.x -= width;
          labelPositionCfg.y += height;
          labelPositionCfg.textAlign = labelPositionCfg.textAlign || 'center';
        } else {
          labelPositionCfg.x -= width;
          labelPositionCfg.y += height;
          labelPositionCfg.textAlign = labelPositionCfg.textAlign || 'left';
        }
        break;
      case 'left':
        if (transposed) {
          labelPositionCfg.x -= width;
          labelPositionCfg.y -= height;
          labelPositionCfg.textAlign = labelPositionCfg.textAlign || 'center';
        } else {
          labelPositionCfg.x += width;
          labelPositionCfg.y += height;
          labelPositionCfg.textAlign = labelPositionCfg.textAlign || 'right';
        }
        break;
      case 'bottom':
        if (transposed) {
          labelPositionCfg.x -= width * 2;
          labelPositionCfg.textAlign = labelPositionCfg.textAlign || 'left';
        } else {
          labelPositionCfg.y += height * 2;
          labelPositionCfg.textAlign = labelPositionCfg.textAlign || 'center';
        }

        break;
      case 'middle':
        if (transposed) {
          labelPositionCfg.x -= width;
        } else {
          labelPositionCfg.y += height;
        }
        labelPositionCfg.textAlign = labelPositionCfg.textAlign || 'center';
        break;
      case 'top':
        if (transposed) {
          labelPositionCfg.textAlign = labelPositionCfg.textAlign || 'left';
        } else {
          labelPositionCfg.textAlign = labelPositionCfg.textAlign || 'center';
        }
        break;
      default:
        break;
    }
  }
}
